import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { FindingsService } from './findings.service';
import { CreateFindingDto, UpdateFindingDto } from './dto/finding.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EvidenceService } from '../evidence/evidence.service';

@ApiTags('Findings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('findings')
export class FindingsController {
  constructor(
    private readonly findings: FindingsService,
    private readonly evidence: EvidenceService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationDto,
    @Query('contractId') contractId?: string,
  ) {
    return this.findings.list(user, query, contractId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.findings.get(user, id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.PENTESTER)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFindingDto) {
    return this.findings.create(user, dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.PENTESTER)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateFindingDto) {
    return this.findings.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.PENTESTER)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.findings.remove(user, id);
  }

  @Post(':id/evidence')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.PENTESTER)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.env.UPLOAD_DIR || './uploads', 'evidence'),
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: (Number(process.env.MAX_UPLOAD_MB) || 25) * 1024 * 1024 },
    }),
  )
  uploadEvidence(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.evidence.attach(user, id, file);
  }
}
