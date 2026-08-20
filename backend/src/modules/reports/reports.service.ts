import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ReportFormat, Role } from '@prisma/client';
import { createReadStream } from 'fs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthUser, orgScope } from '../../common/types/auth-user';
import { QUEUE_REPORT } from '../queue/queue.constants';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectQueue(QUEUE_REPORT) private readonly reportQueue: Queue,
  ) {}

  async list(actor: AuthUser, contractId?: string) {
    return this.prisma.report.findMany({
      where: {
        deletedAt: null,
        ...orgScope(actor),
        ...(contractId ? { contractId } : {}),
        ...(actor.role === Role.PENTESTER || actor.role === Role.VIEWER
          ? { contract: { assignments: { some: { userId: actor.id } } } }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        contract: { select: { id: true, code: true, title: true } },
        generatedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async enqueue(actor: AuthUser, contractId: string, format: ReportFormat) {
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
    const report = await this.prisma.report.create({
      data: {
        organizationId: contract.organizationId,
        contractId,
        generatedById: actor.id,
        title: `${contract.code} ${format} report`,
        format,
      },
    });
    await this.reportQueue.add('generate', { reportId: report.id }, { attempts: 2, removeOnComplete: 50 });
    await this.audit.log({
      actorId: actor.id,
      organizationId: contract.organizationId,
      action: 'report.queue',
      entityType: 'Report',
      entityId: report.id,
      after: { format, contractId },
    });
    return report;
  }

  async download(actor: AuthUser, id: string) {
    const report = await this.prisma.report.findFirst({
      where: { id, deletedAt: null, ...orgScope(actor) },
    });
    if (!report || !report.storagePath) throw new NotFoundException('Report not ready');
    if (actor.role !== Role.SUPER_ADMIN && report.organizationId !== actor.organizationId) {
      throw new ForbiddenException();
    }
    const ext = report.format === 'PDF' ? 'pdf' : 'docx';
    const mime =
      report.format === 'PDF'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return {
      stream: createReadStream(report.storagePath),
      mime,
      filename: `${report.title.replace(/\s+/g, '_')}.${ext}`,
    };
  }
}
