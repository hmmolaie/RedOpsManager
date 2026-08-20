import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationDto) {
    return this.users.list(user, query);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.get(user, id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.users.create(user, dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.remove(user, id);
  }
}
