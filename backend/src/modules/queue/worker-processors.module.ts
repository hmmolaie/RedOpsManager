import { Module } from '@nestjs/common';
import { QueueCoreModule } from './queue.module';
import { ScanProcessor } from './scan.processor';
import { AgentCheckProcessor } from './agent-check.processor';
import { ReportProcessor } from './report.processor';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [QueueCoreModule, NotificationsModule, ReportsModule],
  providers: [ScanProcessor, AgentCheckProcessor, ReportProcessor],
})
export class WorkerProcessorsModule {}
