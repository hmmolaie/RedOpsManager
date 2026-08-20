import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ReportBuilder } from './report.builder';
import { QUEUE_REPORT } from '../queue/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_REPORT })],
  controllers: [ReportsController],
  providers: [ReportsService, ReportBuilder],
  exports: [ReportBuilder, ReportsService],
})
export class ReportsModule {}
