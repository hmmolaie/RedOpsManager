import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthUser } from '../../common/types/auth-user';
import { ContactDto, CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { PaginationDto, skipTake } from '../../common/dto/pagination.dto';

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: AuthUser, query: PaginationDto) {
    const where = {
      deletedAt: null,
      ...(actor.role === Role.SUPER_ADMIN ? {} : { id: actor.organizationId ?? 'none' }),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where,
        ...skipTake(query),
        orderBy: { name: 'asc' },
        include: { _count: { select: { users: true, contracts: true, contacts: true } } },
      }),
      this.prisma.organization.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async get(actor: AuthUser, id: string) {
    this.assertRead(actor, id);
    const org = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      include: { contacts: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } } },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async create(actor: AuthUser, dto: CreateOrganizationDto) {
    if (actor.role !== Role.SUPER_ADMIN) throw new ForbiddenException();
    const slug = dto.slug || `${slugify(dto.name)}-${Date.now().toString(36)}`;
    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        website: dto.website,
        industry: dto.industry,
        contacts: dto.contacts?.length
          ? { create: dto.contacts.map((c) => ({ ...c, isPrimary: c.isPrimary ?? false })) }
          : undefined,
      },
      include: { contacts: true },
    });
    await this.audit.log({
      actorId: actor.id,
      organizationId: org.id,
      action: 'organization.create',
      entityType: 'Organization',
      entityId: org.id,
      after: { name: org.name, slug: org.slug },
    });
    return org;
  }

  async update(actor: AuthUser, id: string, dto: UpdateOrganizationDto) {
    this.assertWrite(actor, id);
    await this.get(actor, id);
    const org = await this.prisma.organization.update({ where: { id }, data: dto });
    await this.audit.log({
      actorId: actor.id,
      organizationId: id,
      action: 'organization.update',
      entityType: 'Organization',
      entityId: id,
      after: dto,
    });
    return org;
  }

  async remove(actor: AuthUser, id: string) {
    if (actor.role !== Role.SUPER_ADMIN) throw new ForbiddenException();
    await this.get(actor, id);
    await this.prisma.organization.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({
      actorId: actor.id,
      organizationId: id,
      action: 'organization.delete',
      entityType: 'Organization',
      entityId: id,
    });
    return { success: true };
  }

  async addContact(actor: AuthUser, orgId: string, dto: ContactDto) {
    this.assertWrite(actor, orgId);
    await this.get(actor, orgId);
    const contact = await this.prisma.organizationContact.create({
      data: { ...dto, organizationId: orgId, isPrimary: dto.isPrimary ?? false },
    });
    await this.audit.log({
      actorId: actor.id,
      organizationId: orgId,
      action: 'organization.contact.create',
      entityType: 'OrganizationContact',
      entityId: contact.id,
    });
    return contact;
  }

  async updateContact(actor: AuthUser, orgId: string, contactId: string, dto: Partial<ContactDto>) {
    this.assertWrite(actor, orgId);
    const contact = await this.prisma.organizationContact.findFirst({
      where: { id: contactId, organizationId: orgId, deletedAt: null },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return this.prisma.organizationContact.update({ where: { id: contactId }, data: dto });
  }

  async removeContact(actor: AuthUser, orgId: string, contactId: string) {
    this.assertWrite(actor, orgId);
    await this.prisma.organizationContact.updateMany({
      where: { id: contactId, organizationId: orgId },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  private assertRead(actor: AuthUser, orgId: string) {
    if (actor.role === Role.SUPER_ADMIN) return;
    if (actor.organizationId !== orgId) throw new ForbiddenException();
  }

  private assertWrite(actor: AuthUser, orgId: string) {
    if (actor.role === Role.SUPER_ADMIN) return;
    if (actor.role === Role.ORG_ADMIN && actor.organizationId === orgId) return;
    throw new ForbiddenException();
  }
}
