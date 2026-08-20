import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: {
    userId: string;
    organizationId?: string | null;
    type?: NotificationType;
    title: string;
    body: string;
    link?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: params.userId,
        organizationId: params.organizationId ?? null,
        type: params.type ?? NotificationType.INFO,
        title: params.title,
        body: params.body,
        link: params.link,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async list(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
