import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { QUEUE_AGENT_CHECK } from '../queue/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_AGENT_CHECK })],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
