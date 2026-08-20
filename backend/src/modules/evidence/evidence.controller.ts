import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { EvidenceService } from './evidence.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Evidence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('evidence')
export class EvidenceController {
  constructor(private readonly evidence: EvidenceService) {}

  @Get(':id/download')
  async download(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() res: Response) {
    const file = await this.evidence.stream(user, id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    file.stream.pipe(res);
  }
}
