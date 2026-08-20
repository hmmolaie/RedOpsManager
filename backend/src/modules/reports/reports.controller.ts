import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { ReportFormat } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class CreateReportDto {
  @ApiProperty()
  @IsUUID()
  contractId!: string;

  @ApiProperty({ enum: ReportFormat })
  @IsEnum(ReportFormat)
  format!: ReportFormat;
}

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('contractId') contractId?: string) {
    return this.reports.list(user, contractId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReportDto) {
    return this.reports.enqueue(user, dto.contractId, dto.format);
  }

  @Get(':id/download')
  async download(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() res: Response) {
    const file = await this.reports.download(user, id);
    res.setHeader('Content-Type', file.mime);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    file.stream.pipe(res);
  }
}
