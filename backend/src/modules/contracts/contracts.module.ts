import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
