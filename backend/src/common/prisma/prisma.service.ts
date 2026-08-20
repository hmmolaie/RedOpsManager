import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async softDelete(model: string, id: string) {
    const delegate = (this as unknown as Record<string, { update: Function }>)[model];
    return delegate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
