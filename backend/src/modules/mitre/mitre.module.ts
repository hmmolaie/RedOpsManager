import { Module } from '@nestjs/common';
import { MitreService } from './mitre.service';
import { MitreController } from './mitre.controller';

@Module({
  controllers: [MitreController],
  providers: [MitreService],
  exports: [MitreService],
})
export class MitreModule {}
