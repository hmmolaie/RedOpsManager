import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthUser, orgScope } from '../../common/types/auth-user';
import { CreateActivityDto } from './dto/activity.dto';
import { PaginationDto, skipTake } from '../../common/dto/pagination.dto';
import { QUEUE_SCAN } from '../queue/queue.constants';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectQueue(QUEUE_SCAN) private readonly scanQueue: Queue,
  ) {}

  async list(actor: AuthUser, query: PaginationDto, filters: { contractId?: string; assetId?: string }) {
    const where: Prisma.ActivityWhereInput = {
      deletedAt: null,
      ...orgScope(actor),
      ...(filters.contractId ? { contractId: filters.contractId } : {}),
      ...(filters.assetId ? { assetId: filters.assetId } : {}),
      ...(actor.role === Role.PENTESTER || actor.role === Role.VIEWER
        ? { contract: { assignments: { some: { userId: actor.id } } } }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where,
        ...skipTake(query),
        orderBy: { createdAt: 'desc' },
        include: {
          asset: { select: { id: true, name: true, value: true, type: true } },
          tactic: { select: { mitreId: true, name: true } },
          technique: { select: { mitreId: true, name: true } },
          executionArm: { select: { id: true, name: true, connectionType: true } },
          author: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.activity.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async get(actor: AuthUser, id: string) {
    const activity = await this.prisma.activity.findFirst({
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
        tactic: true,
        technique: true,
        executionArm: { select: { id: true, name: true, connectionType: true, status: true } },
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
        findings: { where: { deletedAt: null } },
      },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    return activity;
  }

  async create(actor: AuthUser, dto: CreateActivityDto) {
    if (actor.role === Role.VIEWER) throw new ForbiddenException();
    const asset = await this.prisma.asset.findFirst({
      where: {
        id: dto.assetId,
        deletedAt: null,
        ...orgScope(actor),
        ...(actor.role === Role.PENTESTER
          ? { contract: { assignments: { some: { userId: actor.id } } } }
          : {}),
      },
      include: { contract: true },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    if (!['DRAFT', 'ACTIVE'].includes(asset.contract.status)) {
      throw new ForbiddenException('Cannot run work on a closed contract');
    }
    const arm = await this.prisma.executionArm.findFirst({
      where: { id: dto.executionArmId, deletedAt: null, organizationId: asset.organizationId },
    });
    if (!arm) throw new NotFoundException('Execution arm not found');

    const command = dto.command?.replaceAll('{{target}}', asset.value).replaceAll('{{asset}}', asset.value);

    const activity = await this.prisma.activity.create({
      data: {
        organizationId: asset.organizationId,
        contractId: asset.contractId,
        assetId: asset.id,
        authorId: actor.id,
        executionArmId: arm.id,
        toolTemplateId: dto.toolTemplateId,
        mitreTacticId: dto.mitreTacticId,
        mitreTechniqueId: dto.mitreTechniqueId,
        title: dto.title,
        tool: dto.tool,
        command,
        pythonCode: dto.pythonCode,
        status: JobStatus.QUEUED,
      },
    });

    await this.scanQueue.add(
      'execute',
      { activityId: activity.id },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );

    await this.audit.log({
      actorId: actor.id,
      organizationId: asset.organizationId,
      action: 'activity.queue',
      entityType: 'Activity',
      entityId: activity.id,
      after: { tool: activity.tool, assetId: asset.id, armId: arm.id },
    });
    return activity;
  }
}
