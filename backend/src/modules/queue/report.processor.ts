import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ReportStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ReportBuilder } from '../reports/report.builder';
import { QUEUE_REPORT } from './queue.constants';

@Processor(QUEUE_REPORT)
export class ReportProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly builder: ReportBuilder,
  ) {
    super();
  }

  async process(job: Job<{ reportId: string }>) {
    const report = await this.prisma.report.findUnique({ where: { id: job.data.reportId } });
    if (!report) return;
    await this.prisma.report.update({
      where: { id: report.id },
      data: { status: ReportStatus.GENERATING },
    });
    try {
      const storagePath = await this.builder.generate(report.id);
      await this.prisma.report.update({
        where: { id: report.id },
        data: { status: ReportStatus.READY, storagePath },
      });
    } catch (err) {
      await this.prisma.report.update({
        where: { id: report.id },
        data: {
          status: ReportStatus.FAILED,
          errorMessage: err instanceof Error ? err.message : 'Report generation failed',
        },
      });
      throw err;
    }
  }
}
