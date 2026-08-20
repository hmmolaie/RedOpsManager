import { Module } from '@nestjs/common';
import { FindingsService } from './findings.service';
import { FindingsController } from './findings.controller';
import { EvidenceModule } from '../evidence/evidence.module';

@Module({
  imports: [EvidenceModule],
  controllers: [FindingsController],
  providers: [FindingsService],
  exports: [FindingsService],
})
export class FindingsModule {}
