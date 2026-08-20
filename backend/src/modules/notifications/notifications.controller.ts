import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('unread') unread?: string) {
    return this.notifications.list(user.id, unread === 'true');
  }

  @Patch('read-all')
  markAll(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Patch(':id/read')
  markOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }
}
