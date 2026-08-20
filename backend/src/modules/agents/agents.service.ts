import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthUser, orgScope } from '../../common/types/auth-user';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';
import { QUEUE_AGENT_CHECK } from '../queue/queue.constants';

export interface AgentCredentials {
  username?: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  apiKey?: string;
  token?: string;
  headers?: Record<string, string>;
  baseUrl?: string;
}

@Injectable()
export class AgentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
    @InjectQueue(QUEUE_AGENT_CHECK) private readonly checkQueue: Queue,
  ) {}

  async list(actor: AuthUser) {
    const items = await this.prisma.executionArm.findMany({
      where: { deletedAt: null, ...orgScope(actor) },
      orderBy: { name: 'asc' },
    });
    return items.map((a) => this.sanitize(a));
  }

  async get(actor: AuthUser, id: string) {
    const agent = await this.prisma.executionArm.findFirst({
      where: { id, deletedAt: null, ...orgScope(actor) },
    });
    if (!agent) throw new NotFoundException('Execution arm not found');
    return this.sanitize(agent);
  }

  async create(actor: AuthUser, dto: CreateAgentDto) {
    this.assertAdmin(actor);
    const organizationId =
      actor.role === Role.SUPER_ADMIN ? dto.organizationId ?? actor.organizationId : actor.organizationId;
    if (!organizationId) throw new ForbiddenException('organizationId is required');
    const agent = await this.prisma.executionArm.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        connectionType: dto.connectionType,
        host: dto.host,
        port: dto.port,
        encryptedCredentials: this.crypto.encryptJson(dto.credentials ?? {}),
        connectionConfig: (dto.connectionConfig ?? {}) as Prisma.InputJsonValue,
      },
    });
    await this.audit.log({
      actorId: actor.id,
      organizationId,
      action: 'agent.create',
      entityType: 'ExecutionArm',
      entityId: agent.id,
      after: { name: agent.name, connectionType: agent.connectionType },
    });
    return this.sanitize(agent);
  }

  async update(actor: AuthUser, id: string, dto: UpdateAgentDto) {
    this.assertAdmin(actor);
    const existing = await this.prisma.executionArm.findFirst({
      where: { id, deletedAt: null, ...orgScope(actor) },
    });
    if (!existing) throw new NotFoundException('Execution arm not found');
    const agent = await this.prisma.executionArm.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        host: dto.host,
        port: dto.port,
        connectionConfig: dto.connectionConfig as Prisma.InputJsonValue | undefined,
        encryptedCredentials: dto.credentials
          ? this.crypto.encryptJson(dto.credentials)
          : undefined,
      },
    });
    await this.audit.log({
      actorId: actor.id,
      organizationId: existing.organizationId,
      action: 'agent.update',
      entityType: 'ExecutionArm',
      entityId: id,
    });
    return this.sanitize(agent);
  }

  async remove(actor: AuthUser, id: string) {
    this.assertAdmin(actor);
    const existing = await this.prisma.executionArm.findFirst({
      where: { id, deletedAt: null, ...orgScope(actor) },
    });
    if (!existing) throw new NotFoundException('Execution arm not found');
    await this.prisma.executionArm.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({
      actorId: actor.id,
      organizationId: existing.organizationId,
      action: 'agent.delete',
      entityType: 'ExecutionArm',
      entityId: id,
    });
    return { success: true };
  }

  async testConnection(actor: AuthUser, id: string) {
    await this.get(actor, id);
    const job = await this.checkQueue.add(
      'check',
      { agentId: id },
      { attempts: 1, removeOnComplete: 50, removeOnFail: 50 },
    );
    return { queued: true, jobId: job.id };
  }

  decryptCredentials(encrypted: string): AgentCredentials {
    return this.crypto.decryptJson<AgentCredentials>(encrypted);
  }

  private sanitize(agent: {
    encryptedCredentials: string;
    [k: string]: unknown;
  }) {
    const creds = this.safeCreds(agent.encryptedCredentials);
    const { encryptedCredentials: _, ...rest } = agent;
    return {
      ...rest,
      hasCredentials: Object.keys(creds).length > 0,
      credentialFields: Object.keys(creds).filter((k) => Boolean(creds[k as keyof AgentCredentials])),
    };
  }

  private safeCreds(encrypted: string): AgentCredentials {
    try {
      return this.crypto.decryptJson<AgentCredentials>(encrypted);
    } catch {
      return {};
    }
  }

  private assertAdmin(actor: AuthUser) {
    if (actor.role === Role.SUPER_ADMIN || actor.role === Role.ORG_ADMIN) return;
    throw new ForbiddenException();
  }
}
