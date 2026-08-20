import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthUser, orgScope, WORKLIST_STATUSES } from '../../common/types/auth-user';
import { ContractStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(actor: AuthUser) {
    const org = orgScope(actor);
    const assigned =
      actor.role === Role.PENTESTER || actor.role === Role.VIEWER
        ? { assignments: { some: { userId: actor.id } } }
        : {};

    const [
      organizations,
      users,
      contracts,
      worklist,
      assets,
      findingsOpen,
      findingsBySeverity,
      jobsByStatus,
      recentActivities,
      recentFindings,
    ] = await Promise.all([
      actor.role === Role.SUPER_ADMIN
        ? this.prisma.organization.count({ where: { deletedAt: null } })
        : 1,
      this.prisma.user.count({ where: { deletedAt: null, ...org } }),
      this.prisma.contract.count({ where: { deletedAt: null, ...org, ...assigned } }),
      this.prisma.contract.count({
        where: {
          deletedAt: null,
          ...org,
          ...assigned,
          status: { in: [...WORKLIST_STATUSES] as ContractStatus[] },
        },
      }),
      this.prisma.asset.count({
        where: { deletedAt: null, ...org, ...(assigned.assignments ? { contract: assigned } : {}) },
      }),
      this.prisma.finding.count({
        where: {
          deletedAt: null,
          ...org,
          status: { in: ['OPEN', 'CONFIRMED'] },
          ...(assigned.assignments ? { contract: assigned } : {}),
        },
      }),
      this.prisma.finding.groupBy({
        by: ['severity'],
        where: { deletedAt: null, ...org, ...(assigned.assignments ? { contract: assigned } : {}) },
        _count: true,
      }),
      this.prisma.activity.groupBy({
        by: ['status'],
        where: { deletedAt: null, ...org, ...(assigned.assignments ? { contract: assigned } : {}) },
        _count: true,
      }),
      this.prisma.activity.findMany({
        where: { deletedAt: null, ...org, ...(assigned.assignments ? { contract: assigned } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { asset: { select: { name: true, value: true } } },
      }),
      this.prisma.finding.findMany({
        where: { deletedAt: null, ...org, ...(assigned.assignments ? { contract: assigned } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { asset: { select: { name: true } } },
      }),
    ]);

    return {
      role: actor.role,
      kpis: { organizations, users, contracts, worklist, assets, findingsOpen },
      findingsBySeverity,
      jobsByStatus,
      recentActivities,
      recentFindings,
    };
  }
}
