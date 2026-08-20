import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JobStatus, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ExecutionEngine } from './execution.engine';
import { NotificationsService } from '../notifications/notifications.service';
import { QUEUE_SCAN } from './queue.constants';

@Processor(QUEUE_SCAN)
export class ScanProcessor extends WorkerHost {
  private readonly logger = new Logger(ScanProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: ExecutionEngine,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<{ activityId: string }>) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: job.data.activityId },
      include: { asset: true },
    });
    if (!activity || !activity.executionArmId) return;

    await this.prisma.activity.update({
      where: { id: activity.id },
      data: { status: JobStatus.RUNNING, startedAt: new Date() },
    });

    const result = await this.engine.runOnArm(activity.executionArmId, {
      tool: activity.tool,
      command: activity.command,
      pythonCode: activity.pythonCode,
      target: activity.asset.value,
    });

    await this.prisma.activity.update({
      where: { id: activity.id },
      data: {
        status: result.ok ? JobStatus.COMPLETED : JobStatus.FAILED,
        finishedAt: new Date(),
        result: result as unknown as Prisma.InputJsonValue,
        errorMessage: result.error,
      },
    });

    await this.notifications.create({
      userId: activity.authorId,
      organizationId: activity.organizationId,
      type: result.ok ? NotificationType.JOB : NotificationType.ERROR,
      title: result.ok ? `Job completed: ${activity.title}` : `Job failed: ${activity.title}`,
      body: result.ok
        ? `Results for ${activity.asset.name} are ready.`
        : result.error || 'Execution failed',
      link: `/activities/${activity.id}`,
    });

    this.logger.log(`Activity ${activity.id} -> ${result.ok ? 'COMPLETED' : 'FAILED'}`);
  }
}
