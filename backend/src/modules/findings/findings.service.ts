import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthUser, orgScope } from '../../common/types/auth-user';
import { CreateFindingDto, UpdateFindingDto } from './dto/finding.dto';
import { PaginationDto, skipTake } from '../../common/dto/pagination.dto';

@Injectable()
export class FindingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: AuthUser, query: PaginationDto, contractId?: string) {
    const where: Prisma.FindingWhereInput = {
      deletedAt: null,
      ...orgScope(actor),
      ...(contractId ? { contractId } : {}),
      ...(actor.role === Role.PENTESTER || actor.role === Role.VIEWER
        ? { contract: { assignments: { some: { userId: actor.id } } } }
        : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.finding.findMany({
        where,
        ...skipTake(query),
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        include: {
          asset: { select: { id: true, name: true, value: true } },
          contract: { select: { id: true, code: true, title: true } },
          technique: { select: { mitreId: true, name: true } },
          evidence: { where: { deletedAt: null }, select: { id: true, originalName: true, mimeType: true, sizeBytes: true } },
        },
      }),
      this.prisma.finding.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async get(actor: AuthUser, id: string) {
    const finding = await this.prisma.finding.findFirst({
      where: {
        id,
        deletedAt: null,
        ...orgScope(actor),
        ...(actor.role === Role.PENTESTER || actor.role === Role.VIEWER
          ? { contract: { assignments: { some: { userId: actor.id } } } }
          : {}),
      },
      include: {
        asset: true,
        contract: { select: { id: true, code: true, title: true } },
        technique: true,
        activity: true,
        evidence: { where: { deletedAt: null } },
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!finding) throw new NotFoundException('Finding not found');
    return finding;
  }

  async create(actor: AuthUser, dto: CreateFindingDto) {
    if (actor.role === Role.VIEWER) throw new ForbiddenException();
    const contract = await this.prisma.contract.findFirst({
      where: {
        id: dto.contractId,
        deletedAt: null,
        ...orgScope(actor),
        ...(actor.role === Role.PENTESTER ? { assignments: { some: { userId: actor.id } } } : {}),
      },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    const finding = await this.prisma.finding.create({
      data: {
        organizationId: contract.organizationId,
        contractId: contract.id,
        assetId: dto.assetId,
        activityId: dto.activityId,
        authorId: actor.id,
        mitreTechniqueId: dto.mitreTechniqueId,
        title: dto.title,
        description: dto.description,
        severity: dto.severity,
        cvss: dto.cvss,
        cwe: dto.cwe,
        recommendation: dto.recommendation,
      },
    });
    await this.audit.log({
      actorId: actor.id,
      organizationId: contract.organizationId,
      action: 'finding.create',
      entityType: 'Finding',
      entityId: finding.id,
      after: { title: finding.title, severity: finding.severity },
    });
    return finding;
  }

  async update(actor: AuthUser, id: string, dto: UpdateFindingDto) {
    if (actor.role === Role.VIEWER) throw new ForbiddenException();
    const existing = await this.get(actor, id);
    const finding = await this.prisma.finding.update({ where: { id }, data: dto });
    await this.audit.log({
      actorId: actor.id,
      organizationId: existing.organizationId,
      action: 'finding.update',
      entityType: 'Finding',
      entityId: id,
      before: { status: existing.status, severity: existing.severity },
      after: { status: finding.status, severity: finding.severity },
    });
    return finding;
  }

  async remove(actor: AuthUser, id: string) {
    if (actor.role === Role.VIEWER) throw new ForbiddenException();
    const existing = await this.get(actor, id);
    await this.prisma.finding.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({
      actorId: actor.id,
      organizationId: existing.organizationId,
      action: 'finding.delete',
      entityType: 'Finding',
      entityId: id,
    });
    return { success: true };
  }
}
