import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/activity.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationDto,
    @Query('contractId') contractId?: string,
    @Query('assetId') assetId?: string,
  ) {
    return this.activities.list(user, query, { contractId, assetId });
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.activities.get(user, id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.PENTESTER)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateActivityDto) {
    return this.activities.create(user, dto);
  }
}
