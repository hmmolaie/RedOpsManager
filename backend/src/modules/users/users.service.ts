import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthUser, orgScope } from '../../common/types/auth-user';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { PaginationDto, skipTake } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: AuthUser, query: PaginationDto) {
    const where = {
      deletedAt: null,
      ...orgScope(actor),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { firstName: { contains: query.search, mode: 'insensitive' as const } },
              { lastName: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        ...skipTake(query),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          organizationId: true,
          lastLoginAt: true,
          createdAt: true,
          organization: { select: { id: true, name: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async get(actor: AuthUser, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null, ...orgScope(actor) },
      include: { organization: { select: { id: true, name: true, slug: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async create(actor: AuthUser, dto: CreateUserDto) {
    this.assertCanManage(actor, dto.role, dto.organizationId);
    const organizationId =
      actor.role === Role.SUPER_ADMIN ? dto.organizationId ?? null : actor.organizationId;
    if (dto.role !== Role.SUPER_ADMIN && !organizationId) {
      throw new ForbiddenException('Non-platform users must belong to an organization');
    }
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: await bcrypt.hash(dto.password, 12),
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        organizationId,
        status: UserStatus.ACTIVE,
      },
    });
    await this.audit.log({
      actorId: actor.id,
      organizationId,
      action: 'user.create',
      entityType: 'User',
      entityId: user.id,
      after: { email: user.email, role: user.role },
    });
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async update(actor: AuthUser, id: string, dto: UpdateUserDto) {
    const existing = await this.get(actor, id);
    if (dto.role) this.assertCanManage(actor, dto.role, dto.organizationId ?? existing.organizationId);
    const data: Record<string, unknown> = { ...dto };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
      delete data.password;
    }
    if (actor.role !== Role.SUPER_ADMIN) {
      delete data.organizationId;
      if (dto.role === Role.SUPER_ADMIN) throw new ForbiddenException();
    }
    const user = await this.prisma.user.update({ where: { id }, data });
    await this.audit.log({
      actorId: actor.id,
      organizationId: user.organizationId,
      action: 'user.update',
      entityType: 'User',
      entityId: id,
      before: { role: existing.role, status: existing.status },
      after: { role: user.role, status: user.status },
    });
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async remove(actor: AuthUser, id: string) {
    if (actor.id === id) throw new ForbiddenException('Cannot delete yourself');
    await this.get(actor, id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: UserStatus.DISABLED },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      actorId: actor.id,
      organizationId: user.organizationId,
      action: 'user.delete',
      entityType: 'User',
      entityId: id,
    });
    return { success: true };
  }

  private assertCanManage(actor: AuthUser, targetRole: Role, targetOrg?: string | null) {
    if (actor.role === Role.SUPER_ADMIN) return;
    if (actor.role !== Role.ORG_ADMIN) throw new ForbiddenException();
    if (targetRole === Role.SUPER_ADMIN) throw new ForbiddenException();
    if (targetOrg && targetOrg !== actor.organizationId) throw new ForbiddenException();
  }
}
