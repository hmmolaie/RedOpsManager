import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AssetsService } from './assets.service';
import { BulkImportAssetsDto, CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationDto,
    @Query('contractId') contractId?: string,
  ) {
    return this.assets.list(user, query, contractId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.assets.get(user, id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.PENTESTER)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAssetDto) {
    return this.assets.create(user, dto);
  }

  @Post('bulk')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.PENTESTER)
  bulk(@CurrentUser() user: AuthUser, @Body() dto: BulkImportAssetsDto) {
    return this.assets.bulkImport(user, dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.PENTESTER)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assets.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.assets.remove(user, id);
  }
}
