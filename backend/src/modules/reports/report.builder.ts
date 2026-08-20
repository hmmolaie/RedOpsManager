import { Injectable, NotFoundException } from '@nestjs/common';
import { createWriteStream, promises as fs } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReportBuilder {
  constructor(private readonly prisma: PrismaService) {}

  async generate(reportId: string): Promise<string> {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');
    const data = await this.collect(report.contractId);
    const dir = join(process.env.UPLOAD_DIR || './uploads', 'reports');
    await fs.mkdir(dir, { recursive: true });
    const filename = `${report.id}.${report.format === 'PDF' ? 'pdf' : 'docx'}`;
    const path = join(dir, filename);
    if (report.format === 'PDF') await this.writePdf(path, data);
    else await this.writeDocx(path, data);
    return path;
  }

  private async collect(contractId: string) {
    const contract = await this.prisma.contract.findUniqueOrThrow({
      where: { id: contractId },
      include: {
        organization: true,
        assets: { where: { deletedAt: null } },
        findings: {
          where: { deletedAt: null },
          include: { asset: true, technique: true },
          orderBy: { severity: 'asc' },
        },
        activities: {
          where: { deletedAt: null },
          include: { asset: true, tactic: true, technique: true },
          orderBy: { createdAt: 'asc' },
        },
        assignments: {
          include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } },
        },
      },
    });
    const tactics = await this.prisma.mitreTactic.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { techniques: { where: { isSubtechnique: false } } },
    });
    const used = new Set(
      contract.activities.filter((a) => a.mitreTechniqueId).map((a) => a.mitreTechniqueId as string),
    );
    const coverage = tactics.map((t) => {
      const total = t.techniques.length || 1;
      const hit = t.techniques.filter((x) => used.has(x.id)).length;
      return { name: t.name, mitreId: t.mitreId, hit, total, pct: Math.round((hit / total) * 100) };
    });
    return { contract, coverage };
  }

  private async writePdf(path: string, data: Awaited<ReturnType<ReportBuilder['collect']>>) {
    const { contract, coverage } = data;
    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = createWriteStream(path);
      doc.pipe(stream);
      doc.fontSize(22).fillColor('#0f172a').text('RedOps Manager', { align: 'left' });
      doc.fontSize(14).fillColor('#334155').text('Penetration Test / Red Team Report');
      doc.moveDown();
      doc.fontSize(11).fillColor('#0f172a').text(`Organization: ${contract.organization.name}`);
      doc.text(`Contract: ${contract.code} — ${contract.title}`);
      doc.text(`Period: ${contract.startDate.toISOString().slice(0, 10)} → ${contract.endDate.toISOString().slice(0, 10)}`);
      doc.text(`Status: ${contract.status}    Amount: ${contract.currency} ${contract.amount}`);
      doc.moveDown();

      doc.fontSize(16).text('1. Executive Summary');
      doc.fontSize(10).fillColor('#334155');
      const open = contract.findings.filter((f) => ['OPEN', 'CONFIRMED'].includes(f.status)).length;
      const crit = contract.findings.filter((f) => f.severity === 'CRITICAL').length;
      doc.text(
        `This engagement assessed ${contract.assets.length} in-scope assets across ${contract.activities.length} recorded activities. ` +
          `${contract.findings.length} findings were documented (${crit} critical, ${open} still open). ` +
          `MITRE ATT&CK coverage is summarized below. All work was performed under the authorized contract scope.`,
      );
      doc.moveDown();

      doc.fillColor('#0f172a').fontSize(16).text('2. Scope (Assets)');
      doc.fontSize(9);
      contract.assets.forEach((a) => {
        doc.text(`• [${a.criticality}] ${a.type}  ${a.name}  (${a.value})`);
      });
      doc.moveDown();

      doc.fontSize(16).text('3. Findings');
      contract.findings.forEach((f, i) => {
        doc.moveDown(0.4);
        doc.fontSize(11).fillColor('#0f172a').text(`${i + 1}. [${f.severity}] ${f.title}`);
        doc.fontSize(9).fillColor('#334155').text(f.description);
        if (f.recommendation) doc.text(`Recommendation: ${f.recommendation}`);
        if (f.technique) doc.text(`MITRE: ${f.technique.mitreId} ${f.technique.name}`);
        if (f.asset) doc.text(`Asset: ${f.asset.name} (${f.asset.value})`);
      });
      doc.moveDown();

      doc.fillColor('#0f172a').fontSize(16).text('4. MITRE ATT&CK Coverage');
      doc.fontSize(9);
      coverage.forEach((c) => doc.text(`• ${c.mitreId} ${c.name}: ${c.hit}/${c.total} (${c.pct}%)`));
      doc.moveDown();

      doc.fontSize(16).text('5. Activity Timeline');
      doc.fontSize(8);
      contract.activities.forEach((a) => {
        const when = a.createdAt.toISOString().replace('T', ' ').slice(0, 16);
        const mitre = a.technique ? `${a.technique.mitreId}` : '-';
        doc.text(`${when}  ${a.status.padEnd(10)}  ${a.tool.padEnd(10)}  ${mitre}  ${a.title}`);
      });
      doc.moveDown();

      doc.fontSize(16).text('6. Recommendations');
      doc.fontSize(10).fillColor('#334155');
      doc.text(
        'Prioritize remediation of Critical and High findings. Expand ATT&CK coverage on tactics with low percentages. ' +
          'Ensure execution arms remain isolated from production credentials except those explicitly in-scope. ' +
          'Re-test after remediation and archive this contract when accepted by the client.',
      );
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#64748b').text(`Generated by RedOps Manager  •  ${new Date().toISOString()}`);
      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });
  }

  private async writeDocx(path: string, data: Awaited<ReturnType<ReportBuilder['collect']>>) {
    const { contract, coverage } = data;
    const heading = (text: string) =>
      new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } });
    const p = (text: string) => new Paragraph({ children: [new TextRun({ text, size: 20 })], spacing: { after: 80 } });

    const findingRows = [
      new TableRow({
        children: ['Sev', 'Title', 'Asset', 'MITRE', 'Status'].map(
          (h) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
            }),
        ),
      }),
      ...contract.findings.map(
        (f) =>
          new TableRow({
            children: [
              f.severity,
              f.title,
              f.asset?.name ?? '-',
              f.technique ? `${f.technique.mitreId}` : '-',
              f.status,
            ].map((c) => new TableCell({ children: [new Paragraph(c)] })),
          }),
      ),
    ];

    const doc = new Document({
      creator: 'RedOps Manager',
      title: `${contract.code} Penetration Test Report`,
      sections: [
        {
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [new TextRun({ text: 'RedOps Manager', bold: true, size: 48 })],
            }),
            p('Penetration Test / Red Team Report'),
            p(`Organization: ${contract.organization.name}`),
            p(`Contract: ${contract.code} — ${contract.title}`),
            p(`Period: ${contract.startDate.toISOString().slice(0, 10)} to ${contract.endDate.toISOString().slice(0, 10)}`),
            heading('1. Executive Summary'),
            p(
              `This engagement assessed ${contract.assets.length} assets with ${contract.activities.length} activities and ${contract.findings.length} findings. Work was performed under authorized contract scope.`,
            ),
            heading('2. Scope (Assets)'),
            ...contract.assets.map((a) => p(`[${a.criticality}] ${a.type} ${a.name} (${a.value})`)),
            heading('3. Findings'),
            new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: findingRows }),
            ...contract.findings.flatMap((f) => [
              new Paragraph({
                text: `${f.severity}: ${f.title}`,
                heading: HeadingLevel.HEADING_2,
              }),
              p(f.description),
              p(`Recommendation: ${f.recommendation || 'See technical appendix in the activity JSON results.'}`),
            ]),
            heading('4. MITRE ATT&CK Coverage'),
            ...coverage.map((c) => p(`${c.mitreId} ${c.name}: ${c.hit}/${c.total} (${c.pct}%)`)),
            heading('5. Activity Timeline'),
            ...contract.activities.map((a) =>
              p(
                `${a.createdAt.toISOString().slice(0, 16)} | ${a.status} | ${a.tool} | ${a.technique?.mitreId ?? '-'} | ${a.title}`,
              ),
            ),
            heading('6. Recommendations'),
            p(
              'Remediate Critical/High findings first, increase ATT&CK coverage on weak tactics, and re-test after fixes. Archive the contract when the client accepts residual risk.',
            ),
          ],
        },
      ],
    });
    const buf = await Packer.toBuffer(doc);
    await fs.writeFile(path, buf);
  }
}
