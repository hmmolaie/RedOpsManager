import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser, orgScope } from '../../common/types/auth-user';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaginationDto, skipTake } from '../../common/dto/pagination.dto';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: PaginationDto, @Query('action') action?: string) {
    const where = {
      ...orgScope(user),
      ...(action ? { action: { contains: action, mode: 'insensitive' as const } } : {}),
      ...(query.search
        ? {
            OR: [
              { action: { contains: query.search, mode: 'insensitive' as const } },
              { entityType: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        ...skipTake(query),
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, email: true, firstName: true, lastName: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
}
