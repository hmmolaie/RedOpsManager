import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContractStatus, NotificationType, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthUser, orgScope, WORKLIST_STATUSES } from '../../common/types/auth-user';
import { AssignUsersDto, CreateContractDto, UpdateContractDto } from './dto/contract.dto';
import { PaginationDto, skipTake } from '../../common/dto/pagination.dto';

const HIDDEN_FROM_WORKLIST: ContractStatus[] = [
  ContractStatus.TERMINATED,
  ContractStatus.COMPLETED,
  ContractStatus.ARCHIVED,
];

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private visibilityWhere(actor: AuthUser): Prisma.ContractWhereInput {
    const base: Prisma.ContractWhereInput = { deletedAt: null, ...orgScope(actor) };
    if (actor.role === Role.PENTESTER || actor.role === Role.VIEWER) {
      return {
        ...base,
        assignments: { some: { userId: actor.id } },
      };
    }
    return base;
  }

  async list(actor: AuthUser, query: PaginationDto, worklist = false) {
    const where: Prisma.ContractWhereInput = {
      ...this.visibilityWhere(actor),
      ...(worklist ? { status: { in: [...WORKLIST_STATUSES] as ContractStatus[] } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.contract.findMany({
        where,
        ...skipTake(query),
        orderBy: { updatedAt: 'desc' },
        include: {
          organization: { select: { id: true, name: true } },
          assignments: {
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
          },
          _count: { select: { assets: true, activities: true, findings: true } },
        },
      }),
      this.prisma.contract.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async get(actor: AuthUser, id: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, ...this.visibilityWhere(actor) },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        assignments: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
        },
        assets: { where: { deletedAt: null }, orderBy: { name: 'asc' } },
        _count: { select: { activities: true, findings: true, reports: true } },
      },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  async create(actor: AuthUser, dto: CreateContractDto) {
    this.assertAdmin(actor);
    const organizationId =
      actor.role === Role.SUPER_ADMIN ? dto.organizationId ?? actor.organizationId : actor.organizationId;
    if (!organizationId) throw new ForbiddenException('organizationId is required');
    const contract = await this.prisma.contract.create({
      data: {
        organizationId,
        code: dto.code,
        title: dto.title,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        amount: dto.amount,
        currency: dto.currency ?? 'USD',
        status: ContractStatus.DRAFT,
        assignments: dto.assigneeIds?.length
          ? {
              create: dto.assigneeIds.map((userId) => ({ userId, assignedBy: actor.id })),
            }
          : undefined,
      },
      include: { assignments: true },
    });
    await this.audit.log({
      actorId: actor.id,
      organizationId,
      action: 'contract.create',
      entityType: 'Contract',
      entityId: contract.id,
      after: { code: contract.code, title: contract.title },
    });
    return contract;
  }

  async update(actor: AuthUser, id: string, dto: UpdateContractDto) {
    this.assertAdmin(actor);
    const existing = await this.get(actor, id);
    const nextStatus = dto.status ?? existing.status;
    const contract = await this.prisma.contract.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
    await this.audit.log({
      actorId: actor.id,
      organizationId: existing.organizationId,
      action: 'contract.update',
      entityType: 'Contract',
      entityId: id,
      before: { status: existing.status },
      after: { status: contract.status },
    });

    if (existing.status !== nextStatus && HIDDEN_FROM_WORKLIST.includes(nextStatus)) {
      const assignees = await this.prisma.contractAssignment.findMany({ where: { contractId: id } });
      await Promise.all(
        assignees.map((a) =>
          this.notifications.create({
            userId: a.userId,
            organizationId: existing.organizationId,
            type: NotificationType.CONTRACT,
            title: `Contract ${existing.code} ${nextStatus.toLowerCase()}`,
            body: `"${existing.title}" is no longer on your worklist.`,
            link: `/contracts/${id}`,
          }),
        ),
      );
    }
    return contract;
  }

  async remove(actor: AuthUser, id: string) {
    this.assertAdmin(actor);
    const existing = await this.get(actor, id);
    await this.prisma.contract.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({
      actorId: actor.id,
      organizationId: existing.organizationId,
      action: 'contract.delete',
      entityType: 'Contract',
      entityId: id,
    });
    return { success: true };
  }

  async assign(actor: AuthUser, id: string, dto: AssignUsersDto) {
    this.assertAdmin(actor);
    const contract = await this.get(actor, id);
    await this.prisma.$transaction(
      dto.userIds.map((userId) =>
        this.prisma.contractAssignment.upsert({
          where: { contractId_userId: { contractId: id, userId } },
          create: { contractId: id, userId, role: dto.role ?? 'MEMBER', assignedBy: actor.id },
          update: { role: dto.role ?? 'MEMBER' },
        }),
      ),
    );
    await Promise.all(
      dto.userIds.map((userId) =>
        this.notifications.create({
          userId,
          organizationId: contract.organizationId,
          type: NotificationType.CONTRACT,
          title: `Assigned to ${contract.code}`,
          body: `You were assigned to contract "${contract.title}".`,
          link: `/contracts/${id}`,
        }),
      ),
    );
    await this.audit.log({
      actorId: actor.id,
      organizationId: contract.organizationId,
      action: 'contract.assign',
      entityType: 'Contract',
      entityId: id,
      after: { userIds: dto.userIds },
    });
    return this.get(actor, id);
  }

  async unassign(actor: AuthUser, id: string, userId: string) {
    this.assertAdmin(actor);
    const contract = await this.get(actor, id);
    await this.prisma.contractAssignment.deleteMany({ where: { contractId: id, userId } });
    await this.audit.log({
      actorId: actor.id,
      organizationId: contract.organizationId,
      action: 'contract.unassign',
      entityType: 'Contract',
      entityId: id,
      after: { userId },
    });
    return { success: true };
  }

  async coverage(actor: AuthUser, id: string) {
    const contract = await this.get(actor, id);
    const tactics = await this.prisma.mitreTactic.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { techniques: { where: { isSubtechnique: false } } },
    });
    const used = await this.prisma.activity.groupBy({
      by: ['mitreTechniqueId'],
      where: {
        contractId: id,
        deletedAt: null,
        mitreTechniqueId: { not: null },
        status: 'COMPLETED',
      },
      _count: true,
    });
    const countByTech = new Map(used.map((u) => [u.mitreTechniqueId, u._count]));
    return {
      contractId: contract.id,
      tactics: tactics.map((t) => ({
        id: t.id,
        mitreId: t.mitreId,
        name: t.name,
        shortName: t.shortName,
        techniques: t.techniques.map((tech) => ({
          id: tech.id,
          mitreId: tech.mitreId,
          name: tech.name,
          count: countByTech.get(tech.id) ?? 0,
        })),
      })),
    };
  }

  private assertAdmin(actor: AuthUser) {
    if (actor.role === Role.SUPER_ADMIN || actor.role === Role.ORG_ADMIN) return;
    throw new ForbiddenException();
  }
}
