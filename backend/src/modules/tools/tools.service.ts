import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthUser, orgScope } from '../../common/types/auth-user';

@Injectable()
export class ToolsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: AuthUser) {
    return this.prisma.toolTemplate.findMany({
      where: {
        deletedAt: null,
        OR: [{ isBuiltin: true }, { organizationId: actor.organizationId }, { organizationId: null }],
      },
      orderBy: [{ isBuiltin: 'desc' }, { name: 'asc' }],
    });
  }
}
