import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { OrganizationsService } from './organizations.service';
import { ContactDto, CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationDto) {
    return this.orgs.list(user, query);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orgs.get(user, id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrganizationDto) {
    return this.orgs.create(user, dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.orgs.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orgs.remove(user, id);
  }

  @Post(':id/contacts')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  addContact(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ContactDto) {
    return this.orgs.addContact(user, id, dto);
  }

  @Patch(':id/contacts/:contactId')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  updateContact(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() dto: ContactDto,
  ) {
    return this.orgs.updateContact(user, id, contactId, dto);
  }

  @Delete(':id/contacts/:contactId')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  removeContact(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ) {
    return this.orgs.removeContact(user, id, contactId);
  }
}
