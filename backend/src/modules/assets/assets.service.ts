import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthUser, orgScope } from '../../common/types/auth-user';
import { BulkImportAssetsDto, CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';
import { PaginationDto, skipTake } from '../../common/dto/pagination.dto';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async assertContractAccess(actor: AuthUser, contractId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: {
        id: contractId,
        deletedAt: null,
        ...orgScope(actor),
        ...(actor.role === Role.PENTESTER || actor.role === Role.VIEWER
          ? { assignments: { some: { userId: actor.id } } }
          : {}),
      },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  async list(actor: AuthUser, query: PaginationDto, contractId?: string) {
    const where: Prisma.AssetWhereInput = {
      deletedAt: null,
      ...orgScope(actor),
      ...(contractId ? { contractId } : {}),
      ...(actor.role === Role.PENTESTER || actor.role === Role.VIEWER
        ? { contract: { assignments: { some: { userId: actor.id } } } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { value: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        ...skipTake(query),
        orderBy: { name: 'asc' },
        include: { contract: { select: { id: true, code: true, title: true } } },
      }),
      this.prisma.asset.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async get(actor: AuthUser, id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id,
        deletedAt: null,
        ...orgScope(actor),
        ...(actor.role === Role.PENTESTER || actor.role === Role.VIEWER
          ? { contract: { assignments: { some: { userId: actor.id } } } }
          : {}),
      },
      include: {
        contract: { select: { id: true, code: true, title: true, status: true, organizationId: true } },
        activities: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            tactic: { select: { mitreId: true, name: true } },
            technique: { select: { mitreId: true, name: true } },
          },
        },
        findings: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async create(actor: AuthUser, dto: CreateAssetDto) {
    if (actor.role === Role.VIEWER) throw new ForbiddenException();
    const contract = await this.assertContractAccess(actor, dto.contractId);
    const asset = await this.prisma.asset.create({
      data: {
        organizationId: contract.organizationId,
        contractId: dto.contractId,
        name: dto.name,
        type: dto.type,
        value: dto.value,
        criticality: dto.criticality ?? 'MEDIUM',
        description: dto.description,
        tags: dto.tags ?? [],
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
    await this.audit.log({
      actorId: actor.id,
      organizationId: contract.organizationId,
      action: 'asset.create',
      entityType: 'Asset',
      entityId: asset.id,
      after: { name: asset.name, value: asset.value, type: asset.type },
    });
    return asset;
  }

  async update(actor: AuthUser, id: string, dto: UpdateAssetDto) {
    if (actor.role === Role.VIEWER) throw new ForbiddenException();
    const existing = await this.get(actor, id);
    const asset = await this.prisma.asset.update({
      where: { id },
      data: {
        ...dto,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });
    await this.audit.log({
      actorId: actor.id,
      organizationId: existing.organizationId,
      action: 'asset.update',
      entityType: 'Asset',
      entityId: id,
    });
    return asset;
  }

  async remove(actor: AuthUser, id: string) {
    if (actor.role === Role.VIEWER || actor.role === Role.PENTESTER) {
      if (actor.role === Role.PENTESTER) throw new ForbiddenException();
    }
    const existing = await this.get(actor, id);
    await this.prisma.asset.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({
      actorId: actor.id,
      organizationId: existing.organizationId,
      action: 'asset.delete',
      entityType: 'Asset',
      entityId: id,
    });
    return { success: true };
  }

  async bulkImport(actor: AuthUser, dto: BulkImportAssetsDto) {
    if (actor.role === Role.VIEWER) throw new ForbiddenException();
    const contract = await this.assertContractAccess(actor, dto.contractId);
    const created = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.asset.create({
          data: {
            organizationId: contract.organizationId,
            contractId: dto.contractId,
            name: item.name,
            type: item.type,
            value: item.value,
            criticality: item.criticality ?? 'MEDIUM',
            tags: item.tags ?? [],
          },
        }),
      ),
    );
    await this.audit.log({
      actorId: actor.id,
      organizationId: contract.organizationId,
      action: 'asset.bulk_import',
      entityType: 'Asset',
      entityId: dto.contractId,
      after: { count: created.length },
    });
    return { imported: created.length, items: created };
  }
}
