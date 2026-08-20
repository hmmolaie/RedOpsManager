import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MitreService {
  constructor(private readonly prisma: PrismaService) {}

  async matrix() {
    const tactics = await this.prisma.mitreTactic.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        techniques: {
          orderBy: { mitreId: 'asc' },
        },
      },
    });
    return tactics.map((t) => ({
      id: t.id,
      mitreId: t.mitreId,
      shortName: t.shortName,
      name: t.name,
      description: t.description,
      url: t.url,
      techniques: t.techniques.filter((x) => !x.isSubtechnique),
      subtechniques: t.techniques.filter((x) => x.isSubtechnique),
    }));
  }

  async tactics() {
    return this.prisma.mitreTactic.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async techniques(tacticId?: string) {
    return this.prisma.mitreTechnique.findMany({
      where: tacticId ? { tacticId } : {},
      orderBy: { mitreId: 'asc' },
      include: { tactic: { select: { mitreId: true, name: true, shortName: true } } },
    });
  }
}
