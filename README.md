# RedOps Manager

Enterprise platform for **authorized** Penetration Testing and Red Team operations. Multi-tenant, RBAC, encrypted secrets, MITRE ATT&CK workflow, async execution arms, and professional PDF/Word reporting.

> Use only against systems you own or have written authorization to test. The API never executes untrusted Python locally; jobs are forwarded to an execution arm you control (or the built-in simulator).

## Architecture

```
┌─────────────┐     JWT      ┌──────────────────┐     Prisma      ┌────────────┐
│  Next.js 14 │ ───────────► │  NestJS API      │ ──────────────► │ PostgreSQL │
│  App Router │              │  /api/v1 + /docs │                 │  16 JSONB  │
└─────────────┘              └────────┬─────────┘                 └────────────┘
                                      │ BullMQ
                                      ▼
                             ┌──────────────────┐     SSH / HTTP / Simulator
                             │ Redis + Worker   │ ────────────────────────────► Execution Arm
                             └──────────────────┘
```

| Layer | Stack |
|---|---|
| Web | Next.js 14 (App Router), TypeScript, Tailwind, TanStack Query, Zustand |
| API | NestJS, Swagger at `/docs`, JWT + refresh tokens, RBAC |
| Data | PostgreSQL 16, Prisma, JSONB on metadata/results |
| Jobs | BullMQ + Redis (scans, reports, agent health) |
| Secrets | AES-256-GCM (`ENCRYPTION_KEY`) |
| Reports | PDFKit (PDF) and `docx` (Word) |

### Tenancy & RBAC

- **SuperAdmin** — platform-wide. Creates organizations and users.
- **OrgAdmin** — full control inside one organization.
- **Pentester** — sees only contracts assigned to them; can run jobs and write findings.
- **Viewer** — read-only on assigned contracts.
- Every tenant-scoped row carries `organizationId`. Guards refuse cross-org access.
- Contract statuses **Terminated**, **Completed**, and **Archived** are excluded from `/contracts/worklist`, so operators lose the engagement the moment an admin closes it.

### MITRE workflow

1. Open a contract → pick an asset.
2. The asset page renders the Enterprise ATT&CK matrix (tactic columns → techniques → optional sub-technique).
3. Choose an execution arm and a tool template (`nmap`, `httpx`, `nuclei`, `ffuf`, or custom Python).
4. The worker dispatches the job. Structured JSON is stored on `Activity.result` (JSONB).

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

The web UI calls the API via same-origin `/api/v1` (Next.js proxies to the API container), so login works from `http://localhost:3000` or `http://SERVER_IP:3000` without changing `NEXT_PUBLIC_API_URL`.

| Service | URL |
|---|---|
| Web UI | http://localhost:3000 (or http://SERVER_IP:3000) |
| API | http://localhost:4000/api/v1 |
| Swagger | http://localhost:4000/docs |
| Postgres | localhost:5432 |
| Redis | localhost:6379 |

### Remote access (public IP)

The web container binds `0.0.0.0:3000`. On the Linux host, open the firewall if needed:

```bash
# ufw
sudo ufw allow 3000/tcp
sudo ufw reload

# or firewalld
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

Then open `http://YOUR_PUBLIC_IP:3000` from another machine. Only port **3000** is required for the UI (API is proxied through Next.js).

### Demo accounts (from seed)

| Role | Email | Password |
|---|---|---|
| SuperAdmin | `admin@redops.local` | `ChangeMe_Admin_123!` |
| Acme OrgAdmin | `orgadmin@acme.local` | `ChangeMe_Org_123!` |
| Acme Pentester | `pentester@acme.local` | `ChangeMe_Pentest_123!` |
| Acme Viewer | `viewer@acme.local` | `ChangeMe_Viewer_123!` |
| Apex OrgAdmin | `orgadmin@apex.local` | `ChangeMe_Org_123!` |

Acme’s pentester **cannot** see Apex Bank contracts (tenant isolation). `ACME-RT-2025-014` is **Terminated** and will not appear on the worklist even though the pentester was assigned.

Change all default passwords and `ENCRYPTION_KEY` / JWT secrets before any real deployment.

## Local development (without Docker for the apps)

Start Postgres 16 and Redis 7, then:

```bash
# API
cd backend
cp ../.env.example .env
# set DATABASE_URL=postgresql://redops:redops_change_me@localhost:5432/redops
# set REDIS_HOST=127.0.0.1
npm install
npx prisma generate
npx prisma migrate deploy   # or: npx prisma db push
npx prisma db seed
npm run start:dev

# Worker (second terminal)
cd backend
npm run start:worker   # after npm run build, or nest start src/worker.ts via node dist/worker.js

# Web
cd frontend
echo NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1 > .env.local
npm install
npm run dev
```

To run the worker in watch mode during development you can also start it with:

```bash
cd backend
npx nest start --entryFile worker --watch
```

## Project layout

```
backend/                 NestJS API + worker
  prisma/schema.prisma  Canonical data model
  prisma/seed.ts        Demo tenants, MITRE catalog, tools
  src/modules/          Auth, orgs, contracts, assets, agents, AI,
                        activities, findings, reports, audit, …
frontend/               Next.js UI
docker-compose.yml
```

## Security notes

- Passwords hashed with bcrypt (cost 12). Refresh tokens stored as SHA-256 hashes and rotated.
- Execution-arm credentials and AI API keys are encrypted, never returned in API responses.
- Custom Python is **forwarded** to the arm. The simulator records the snippet and does not `eval` it.
- Helmet, validation whitelist, throttling, and an HTTP exception filter are enabled on the API.
- Soft deletes (`deletedAt`) plus an append-only `AuditLog`.

## Generating reports

From **Reports**, pick a contract and queue PDF or DOCX. The worker writes files under `UPLOAD_DIR/reports`. Sections: executive summary, assets, findings, MITRE coverage, activity timeline, recommendations.

## API modules (Swagger)

Auth, Users, Organizations (+ contacts), Contracts (+ assignments + coverage heatmap), Assets (bulk import), Execution Arms (test connection), AI endpoints, MITRE matrix, Tool templates, Activities (job queue), Findings + evidence upload, Reports, Notifications, Dashboard, Audit logs, Health.

## License

UNLICENSED — internal / customer deployment. Do not use this software to attack systems without authorization.
