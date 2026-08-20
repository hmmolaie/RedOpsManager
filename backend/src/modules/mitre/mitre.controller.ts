import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MitreService } from './mitre.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('MITRE ATT&CK')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mitre')
export class MitreController {
  constructor(private readonly mitre: MitreService) {}

  @Get('matrix')
  matrix() {
    return this.mitre.matrix();
  }

  @Get('tactics')
  tactics() {
    return this.mitre.tactics();
  }

  @Get('techniques')
  techniques(@Query('tacticId') tacticId?: string) {
    return this.mitre.techniques(tacticId);
  }
}
