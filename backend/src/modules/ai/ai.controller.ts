import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AiService } from './ai.service';
import { CreateAiEndpointDto, UpdateAiEndpointDto } from './dto/ai.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('AI Configuration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai-endpoints')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.ai.list(user);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAiEndpointDto) {
    return this.ai.create(user, dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateAiEndpointDto) {
    return this.ai.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ai.remove(user, id);
  }
}
