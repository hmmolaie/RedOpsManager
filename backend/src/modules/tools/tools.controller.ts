import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ToolsService } from './tools.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Tool Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tools')
export class ToolsController {
  constructor(private readonly tools: ToolsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.tools.list(user);
  }
}
