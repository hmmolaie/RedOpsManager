import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ContractsService } from './contracts.service';
import { AssignUsersDto, CreateContractDto, UpdateContractDto } from './dto/contract.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationDto) {
    return this.contracts.list(user, query, false);
  }

  @Get('worklist')
  worklist(@CurrentUser() user: AuthUser, @Query() query: PaginationDto) {
    return this.contracts.list(user, query, true);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.contracts.get(user, id);
  }

  @Get(':id/coverage')
  coverage(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.contracts.coverage(user, id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateContractDto) {
    return this.contracts.create(user, dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.contracts.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.contracts.remove(user, id);
  }

  @Post(':id/assignments')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  assign(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AssignUsersDto) {
    return this.contracts.assign(user, id, dto);
  }

  @Delete(':id/assignments/:userId')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  unassign(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('userId') userId: string) {
    return this.contracts.unassign(user, id, userId);
  }
}
