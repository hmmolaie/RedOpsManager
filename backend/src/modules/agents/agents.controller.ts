import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AgentsService } from './agents.service';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Execution Arms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.agents.list(user);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.agents.get(user, id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAgentDto) {
    return this.agents.create(user, dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateAgentDto) {
    return this.agents.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.agents.remove(user, id);
  }

  @Post(':id/test')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.PENTESTER)
  test(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.agents.testConnection(user, id);
  }
}
