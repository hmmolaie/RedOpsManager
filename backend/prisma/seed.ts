import { PrismaClient, Role, UserStatus, ContractStatus, AssetType, Criticality, AgentConnectionType, JobStatus, FindingSeverity, FindingStatus, ContactType, NotificationType, AiProvider } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createCipheriv, createHash, randomBytes } from 'crypto';
import { MITRE_ENTERPRISE, TOOL_TEMPLATES } from './data/catalog';

const prisma = new PrismaClient();

function encrypt(plaintext: string): string {
  const raw = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const key = raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)
    ? Buffer.from(raw, 'hex')
    : createHash('sha256').update(raw).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

async function seedMitre() {
  for (const tactic of MITRE_ENTERPRISE) {
    const t = await prisma.mitreTactic.upsert({
      where: { mitreId: tactic.mitreId },
      update: { name: tactic.name, description: tactic.description, shortName: tactic.shortName, sortOrder: tactic.sortOrder },
      create: {
        mitreId: tactic.mitreId,
        shortName: tactic.shortName,
        name: tactic.name,
        description: tactic.description,
        sortOrder: tactic.sortOrder,
        url: `https://attack.mitre.org/tactics/${tactic.mitreId}/`,
      },
    });
    for (const tech of tactic.techniques) {
      await prisma.mitreTechnique.upsert({
        where: { mitreId_tacticId: { mitreId: tech.mitreId, tacticId: t.id } },
        update: { name: tech.name, description: tech.description },
        create: {
          mitreId: tech.mitreId,
          name: tech.name,
          description: tech.description,
          url: `https://attack.mitre.org/techniques/${tech.mitreId}/`,
          tacticId: t.id,
        },
      });
      for (const sub of tech.sub ?? []) {
        await prisma.mitreTechnique.upsert({
          where: { mitreId_tacticId: { mitreId: sub.mitreId, tacticId: t.id } },
          update: { name: sub.name, description: sub.description },
          create: {
            mitreId: sub.mitreId,
            name: sub.name,
            description: sub.description,
            isSubtechnique: true,
            parentMitreId: tech.mitreId,
            url: `https://attack.mitre.org/techniques/${sub.mitreId.replace('.', '/')}/`,
            tacticId: t.id,
          },
        });
      }
    }
  }
}

async function seedTools() {
  for (const tool of TOOL_TEMPLATES) {
    const existing = await prisma.toolTemplate.findFirst({ where: { slug: tool.slug, isBuiltin: true } });
    if (existing) {
      await prisma.toolTemplate.update({ where: { id: existing.id }, data: tool });
    } else {
      await prisma.toolTemplate.create({ data: { ...tool, isBuiltin: true, organizationId: null } });
    }
  }
}

async function main() {
  console.log('Seeding RedOps Manager…');
  await seedMitre();
  await seedTools();

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@redops.local').toLowerCase();
  const adminPass = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe_Admin_123!';

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPass, 12),
      firstName: 'Platform',
      lastName: 'Admin',
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const acme = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      description: 'Global manufacturing and e-commerce — authorized pentest client.',
      website: 'https://acme.example',
      industry: 'Manufacturing',
      contacts: {
        create: [
          { type: ContactType.EMAIL, label: 'Security mailbox', value: 'security@acme.example', isPrimary: true },
          { type: ContactType.PHONE, label: 'SOC hotline', value: '+1-555-0100', isPrimary: false },
          { type: ContactType.ADDRESS, label: 'HQ', value: '100 Industrial Way, Austin, TX', isPrimary: false },
          { type: ContactType.PERSON, label: 'CISO', value: 'jordan.lee@acme.example', personName: 'Jordan Lee', personRole: 'CISO', isPrimary: true },
        ],
      },
    },
  });

  const apex = await prisma.organization.upsert({
    where: { slug: 'apex-bank' },
    update: {},
    create: {
      name: 'Apex Bank',
      slug: 'apex-bank',
      description: 'Regional bank — isolated tenant for multi-tenancy demo.',
      website: 'https://apexbank.example',
      industry: 'Financial Services',
      contacts: {
        create: [
          { type: ContactType.EMAIL, label: 'GRC', value: 'grc@apexbank.example', isPrimary: true },
          { type: ContactType.PERSON, label: 'Head of Cyber', value: 'samira.khan@apexbank.example', personName: 'Samira Khan', personRole: 'Head of Cyber', isPrimary: true },
        ],
      },
    },
  });

  const [orgAdmin, pentester, viewer, apexAdmin, apexPentester] = await Promise.all([
    upsertUser('orgadmin@acme.local', 'ChangeMe_Org_123!', 'Maya', 'Chen', Role.ORG_ADMIN, acme.id),
    upsertUser('pentester@acme.local', 'ChangeMe_Pentest_123!', 'Alex', 'Rivera', Role.PENTESTER, acme.id),
    upsertUser('viewer@acme.local', 'ChangeMe_Viewer_123!', 'Riley', 'Patel', Role.VIEWER, acme.id),
    upsertUser('orgadmin@apex.local', 'ChangeMe_Org_123!', 'Samira', 'Khan', Role.ORG_ADMIN, apex.id),
    upsertUser('pentester@apex.local', 'ChangeMe_Pentest_123!', 'Noah', 'Brooks', Role.PENTESTER, apex.id),
  ]);

  const active = await upsertContract(acme.id, 'ACME-PT-2026-001', 'External network pentest Q1', ContractStatus.ACTIVE, '2026-01-15', '2026-03-31', 85000);
  const terminated = await upsertContract(acme.id, 'ACME-RT-2025-014', 'Red Team 2025 (closed)', ContractStatus.TERMINATED, '2025-08-01', '2025-11-30', 140000);
  const apexContract = await upsertContract(apex.id, 'APEX-PT-2026-002', 'Internet perimeter assessment', ContractStatus.ACTIVE, '2026-02-01', '2026-04-30', 120000);

  await assign(active.id, [pentester.id, viewer.id, orgAdmin.id], admin.id);
  await assign(terminated.id, [pentester.id], admin.id);
  await assign(apexContract.id, [apexPentester.id, apexAdmin.id], admin.id);

  const assets = await seedAssets(acme.id, active.id);
  await seedAssets(apex.id, apexContract.id, true);

  const simulator = await prisma.executionArm.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      organizationId: acme.id,
      name: 'Lab Simulator Arm',
      description: 'In-process simulator for demos. Does not touch real networks.',
      connectionType: AgentConnectionType.SIMULATOR,
      host: 'simulator.local',
      encryptedCredentials: encrypt(JSON.stringify({})),
      capabilities: ['nmap', 'httpx', 'nuclei', 'ffuf', 'python'],
      status: 'ONLINE',
    },
  });

  await prisma.executionArm.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      organizationId: apex.id,
      name: 'Apex Simulator',
      description: 'Tenant-isolated simulator.',
      connectionType: AgentConnectionType.SIMULATOR,
      encryptedCredentials: encrypt(JSON.stringify({})),
      status: 'ONLINE',
    },
  });

  await prisma.aiEndpoint.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000aa' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-0000000000aa',
      organizationId: acme.id,
      name: 'Acme OpenAI-compatible',
      provider: AiProvider.OPENAI,
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      encryptedApiKey: encrypt('sk-demo-not-a-real-key'),
      isDefault: true,
    },
  });

  const recon = await prisma.mitreTactic.findUnique({ where: { mitreId: 'TA0043' } });
  const discovery = await prisma.mitreTactic.findUnique({ where: { mitreId: 'TA0007' } });
  const t1595 = recon
    ? await prisma.mitreTechnique.findFirst({ where: { mitreId: 'T1595', tacticId: recon.id } })
    : null;
  const t1046 = discovery
    ? await prisma.mitreTechnique.findFirst({ where: { mitreId: 'T1046', tacticId: discovery.id } })
    : null;

  const nmapTpl = await prisma.toolTemplate.findFirst({ where: { slug: 'nmap-service-scan' } });

  const activity = await prisma.activity.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000a1' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-0000000000a1',
      organizationId: acme.id,
      contractId: active.id,
      assetId: assets[0].id,
      authorId: pentester.id,
      executionArmId: simulator.id,
      toolTemplateId: nmapTpl?.id,
      mitreTacticId: recon?.id,
      mitreTechniqueId: t1595?.id,
      title: 'External service discovery — www.acme.example',
      tool: 'nmap',
      command: 'nmap -sV -sC -T4 -oX - www.acme.example',
      status: JobStatus.COMPLETED,
      queuedAt: new Date('2026-02-02T10:00:00Z'),
      startedAt: new Date('2026-02-02T10:00:02Z'),
      finishedAt: new Date('2026-02-02T10:04:18Z'),
      result: {
        engine: 'simulator',
        tool: 'nmap',
        target: 'www.acme.example',
        hosts: [
          {
            address: '203.0.113.10',
            status: 'up',
            ports: [
              { port: 80, state: 'open', service: 'http' },
              { port: 443, state: 'open', service: 'https' },
            ],
          },
        ],
      },
    },
  });

  await prisma.activity.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000a2' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-0000000000a2',
      organizationId: acme.id,
      contractId: active.id,
      assetId: assets[1].id,
      authorId: pentester.id,
      executionArmId: simulator.id,
      mitreTacticId: discovery?.id,
      mitreTechniqueId: t1046?.id,
      title: 'Network service discovery — 203.0.113.0/24',
      tool: 'nmap',
      status: JobStatus.COMPLETED,
      result: { engine: 'simulator', note: 'Seeded completed discovery job' },
    },
  });

  await prisma.finding.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000f1' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-0000000000f1',
      organizationId: acme.id,
      contractId: active.id,
      assetId: assets[0].id,
      activityId: activity.id,
      authorId: pentester.id,
      title: 'Outdated TLS configuration on public site',
      description: 'The public website negotiates TLS 1.1 and a weak cipher suite. This increases the likelihood of protocol downgrade in a hostile network.',
      severity: FindingSeverity.MEDIUM,
      status: FindingStatus.OPEN,
      cvss: 5.3,
      cwe: 'CWE-327',
      recommendation: 'Disable TLS 1.0/1.1, prefer TLS 1.2+ with modern cipher suites, and enable HSTS.',
    },
  });

  await prisma.finding.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000f2' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-0000000000f2',
      organizationId: acme.id,
      contractId: active.id,
      assetId: assets[2].id,
      authorId: pentester.id,
      title: 'Administrative interface exposed to the Internet',
      description: 'An admin panel is reachable from the in-scope perimeter without IP allow-listing.',
      severity: FindingSeverity.HIGH,
      status: FindingStatus.CONFIRMED,
      cvss: 7.5,
      recommendation: 'Restrict the panel to VPN or bastion access and enforce MFA.',
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        organizationId: acme.id,
        userId: pentester.id,
        type: NotificationType.CONTRACT,
        title: 'Assigned to ACME-PT-2026-001',
        body: 'You were assigned to the Q1 external network pentest.',
        link: `/contracts/${active.id}`,
      },
      {
        organizationId: acme.id,
        userId: pentester.id,
        type: NotificationType.JOB,
        title: 'Job completed: External service discovery',
        body: 'Structured results are available on the asset activity timeline.',
        link: `/activities/${activity.id}`,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.auditLog.create({
    data: {
      organizationId: acme.id,
      actorId: admin.id,
      action: 'seed.complete',
      entityType: 'System',
      after: { message: 'Demo dataset loaded' },
    },
  });

  console.log('Seed complete.');
  console.log('  SuperAdmin :', adminEmail, '/', adminPass);
  console.log('  OrgAdmin   : orgadmin@acme.local / ChangeMe_Org_123!');
  console.log('  Pentester  : pentester@acme.local / ChangeMe_Pentest_123!');
  console.log('  Viewer     : viewer@acme.local / ChangeMe_Viewer_123!');
  console.log('  Apex admin : orgadmin@apex.local / ChangeMe_Org_123!');
}

async function upsertUser(email: string, password: string, firstName: string, lastName: string, role: Role, organizationId: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      firstName,
      lastName,
      role,
      organizationId,
      status: UserStatus.ACTIVE,
    },
  });
}

async function upsertContract(
  organizationId: string,
  code: string,
  title: string,
  status: ContractStatus,
  start: string,
  end: string,
  amount: number,
) {
  const existing = await prisma.contract.findUnique({ where: { organizationId_code: { organizationId, code } } });
  if (existing) return existing;
  return prisma.contract.create({
    data: {
      organizationId,
      code,
      title,
      description: title,
      startDate: new Date(start),
      endDate: new Date(end),
      amount,
      currency: 'USD',
      status,
    },
  });
}

async function assign(contractId: string, userIds: string[], assignedBy: string) {
  for (const userId of userIds) {
    await prisma.contractAssignment.upsert({
      where: { contractId_userId: { contractId, userId } },
      update: {},
      create: { contractId, userId, assignedBy, role: 'MEMBER' },
    });
  }
}

async function seedAssets(organizationId: string, contractId: string, apex = false) {
  const rows = apex
    ? [
        { name: 'Internet banking', type: AssetType.URL, value: 'https://ib.apexbank.example', criticality: Criticality.CRITICAL },
        { name: 'Perimeter /24', type: AssetType.SUBNET, value: '198.51.100.0/24', criticality: Criticality.HIGH },
      ]
    : [
        { name: 'www.acme.example', type: AssetType.DOMAIN, value: 'www.acme.example', criticality: Criticality.HIGH, tags: ['prod', 'web'] },
        { name: 'DMZ subnet', type: AssetType.SUBNET, value: '203.0.113.0/24', criticality: Criticality.HIGH, tags: ['dmz'] },
        { name: 'VPN concentrator', type: AssetType.IP, value: '203.0.113.5', criticality: Criticality.CRITICAL, tags: ['vpn'] },
        { name: 'Customer portal', type: AssetType.APPLICATION, value: 'https://portal.acme.example', criticality: Criticality.HIGH },
        { name: 'Dev API', type: AssetType.URL, value: 'https://api-dev.acme.example', criticality: Criticality.MEDIUM, tags: ['nonprod'] },
      ];
  const created = [];
  for (const row of rows) {
    const found = await prisma.asset.findFirst({ where: { contractId, value: row.value, deletedAt: null } });
    if (found) created.push(found);
    else created.push(await prisma.asset.create({ data: { organizationId, contractId, ...row } }));
  }
  return created;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
