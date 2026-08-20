import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { AuditService } from '../../common/audit/audit.service';
import { LoginDto } from './dto/auth.dto';
import { UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
  ) {}

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is disabled');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    const tokens = await this.issueTokens(user.id, user.email, user.role, user.organizationId, ip, userAgent);
    await this.audit.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: 'auth.login',
      entityType: 'User',
      entityId: user.id,
      ipAddress: ip,
      userAgent,
    });

    return {
      ...tokens,
      user: this.safeUser(user),
    };
  }

  async refresh(refreshToken: string, ip?: string, userAgent?: string) {
    const hash = this.crypto.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!stored || stored.user.deletedAt || stored.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const tokens = await this.issueTokens(
      stored.user.id,
      stored.user.email,
      stored.user.role,
      stored.user.organizationId,
      ip,
      userAgent,
    );
    return { ...tokens, user: this.safeUser(stored.user) };
  }

  async logout(refreshToken: string, actorId?: string) {
    const hash = this.crypto.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (actorId) {
      await this.audit.log({
        actorId,
        action: 'auth.logout',
        entityType: 'User',
        entityId: actorId,
      });
    }
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { organization: { select: { id: true, name: true, slug: true, status: true } } },
    });
    if (!user) throw new UnauthorizedException();
    return this.safeUser(user);
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: string,
    organizationId: string | null,
    ip?: string,
    userAgent?: string,
  ) {
    const payload = { sub: userId, email, role, organizationId };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m'),
    });
    const refreshToken = this.crypto.randomToken();
    const days = 7;
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.crypto.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        ipAddress: ip,
        userAgent,
      },
    });
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 900 };
  }

  private safeUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    organizationId: string | null;
    organization?: unknown;
    lastLoginAt?: Date | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      organizationId: user.organizationId,
      organization: user.organization ?? undefined,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
