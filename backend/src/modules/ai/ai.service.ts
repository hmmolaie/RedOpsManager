import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthUser, orgScope } from '../../common/types/auth-user';
import { CreateAiEndpointDto, UpdateAiEndpointDto } from './dto/ai.dto';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: AuthUser) {
    const items = await this.prisma.aiEndpoint.findMany({
      where: {
        deletedAt: null,
        OR: [
          { organizationId: null },
          ...(actor.role === Role.SUPER_ADMIN
            ? [{ organizationId: { not: null } }]
            : actor.organizationId
              ? [{ organizationId: actor.organizationId }]
              : []),
        ],
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    return items.map((e) => this.sanitize(e));
  }

  async create(actor: AuthUser, dto: CreateAiEndpointDto) {
    this.assertAdmin(actor);
    const organizationId =
      actor.role === Role.SUPER_ADMIN ? dto.organizationId ?? null : actor.organizationId;
    if (dto.isDefault && organizationId) {
      await this.prisma.aiEndpoint.updateMany({
        where: { organizationId },
        data: { isDefault: false },
      });
    }
    const created = await this.prisma.aiEndpoint.create({
      data: {
        organizationId,
        name: dto.name,
        provider: dto.provider,
        baseUrl: dto.baseUrl.replace(/\/$/, ''),
        model: dto.model,
        encryptedApiKey: dto.apiKey ? this.crypto.encrypt(dto.apiKey) : null,
        isDefault: dto.isDefault ?? false,
        extraHeaders: (dto.extraHeaders ?? {}) as Prisma.InputJsonValue,
      },
    });
    await this.audit.log({
      actorId: actor.id,
      organizationId,
      action: 'ai.create',
      entityType: 'AiEndpoint',
      entityId: created.id,
      after: { name: created.name, provider: created.provider, model: created.model },
    });
    return this.sanitize(created);
  }

  async update(actor: AuthUser, id: string, dto: UpdateAiEndpointDto) {
    this.assertAdmin(actor);
    const existing = await this.prisma.aiEndpoint.findFirst({
      where: { id, deletedAt: null, ...orgScope(actor) },
    });
    if (!existing) throw new NotFoundException('AI endpoint not found');
    const updated = await this.prisma.aiEndpoint.update({
      where: { id },
      data: {
        name: dto.name,
        baseUrl: dto.baseUrl?.replace(/\/$/, ''),
        model: dto.model,
        isDefault: dto.isDefault,
        isActive: dto.isActive,
        encryptedApiKey: dto.apiKey ? this.crypto.encrypt(dto.apiKey) : undefined,
      },
    });
    return this.sanitize(updated);
  }

  async remove(actor: AuthUser, id: string) {
    this.assertAdmin(actor);
    await this.update(actor, id, {});
    await this.prisma.aiEndpoint.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  private sanitize(e: { encryptedApiKey: string | null; [k: string]: unknown }) {
    const { encryptedApiKey, ...rest } = e;
    return { ...rest, hasApiKey: Boolean(encryptedApiKey) };
  }

  private assertAdmin(actor: AuthUser) {
    if (actor.role === Role.SUPER_ADMIN || actor.role === Role.ORG_ADMIN) return;
    throw new ForbiddenException();
  }
}
