import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';
import { QUEUE_SCAN } from '../queue/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_SCAN })],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
