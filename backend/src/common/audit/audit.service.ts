import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface AuditInput {
  organizationId?: string | null;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditInput) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: input.organizationId ?? null,
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        before: (input.before ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        after: (input.after ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}
