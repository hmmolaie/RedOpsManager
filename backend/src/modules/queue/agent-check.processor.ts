import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AgentStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ExecutionEngine } from './execution.engine';
import { QUEUE_AGENT_CHECK } from './queue.constants';

@Processor(QUEUE_AGENT_CHECK)
export class AgentCheckProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: ExecutionEngine,
  ) {
    super();
  }

  async process(job: Job<{ agentId: string }>) {
    const probe = await this.engine.probe(job.data.agentId);
    await this.prisma.executionArm.update({
      where: { id: job.data.agentId },
      data: {
        status: probe.ok ? AgentStatus.ONLINE : AgentStatus.OFFLINE,
        lastCheckedAt: new Date(),
        lastError: probe.ok ? null : probe.message,
      },
    });
    return probe;
  }
}
