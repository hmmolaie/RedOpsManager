import { Injectable, NotFoundException } from '@nestjs/common';
import { createReadStream, promises as fs } from 'fs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthUser, orgScope } from '../../common/types/auth-user';
import { Role } from '@prisma/client';

@Injectable()
export class EvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
  ) {}

  async attach(actor: AuthUser, findingId: string, file: Express.Multer.File) {
    const finding = await this.prisma.finding.findFirst({
      where: {
        id: findingId,
        deletedAt: null,
        ...orgScope(actor),
        ...(actor.role === Role.PENTESTER || actor.role === Role.VIEWER
          ? { contract: { assignments: { some: { userId: actor.id } } } }
          : {}),
      },
    });
    if (!finding) throw new NotFoundException('Finding not found');
    const buf = await fs.readFile(file.path);
    const evidence = await this.prisma.evidence.create({
      data: {
        findingId,
        uploadedById: actor.id,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath: file.path,
        checksumSha256: this.crypto.sha256(buf),
      },
    });
    await this.audit.log({
      actorId: actor.id,
      organizationId: finding.organizationId,
      action: 'evidence.upload',
      entityType: 'Evidence',
      entityId: evidence.id,
      after: { originalName: file.originalname, sizeBytes: file.size },
    });
    return evidence;
  }

  async stream(actor: AuthUser, id: string) {
    const evidence = await this.prisma.evidence.findFirst({
      where: { id, deletedAt: null },
      include: { finding: true },
    });
    if (!evidence) throw new NotFoundException('Evidence not found');
    if (actor.role !== Role.SUPER_ADMIN && evidence.finding.organizationId !== actor.organizationId) {
      throw new NotFoundException('Evidence not found');
    }
    return {
      stream: createReadStream(evidence.storagePath),
      mimeType: evidence.mimeType,
      originalName: evidence.originalName,
    };
  }
}
