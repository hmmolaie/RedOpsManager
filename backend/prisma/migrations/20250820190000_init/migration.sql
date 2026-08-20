-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ORG_ADMIN', 'PENTESTER', 'VIEWER');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED', 'INVITED');
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "ContactType" AS ENUM ('PHONE', 'EMAIL', 'ADDRESS', 'PERSON');
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'ARCHIVED');
CREATE TYPE "AssignmentRole" AS ENUM ('LEAD', 'MEMBER');
CREATE TYPE "AssetType" AS ENUM ('IP', 'DOMAIN', 'URL', 'SUBNET', 'HOST', 'APPLICATION', 'EMAIL', 'OTHER');
CREATE TYPE "Criticality" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');
CREATE TYPE "AgentConnectionType" AS ENUM ('SSH_PASSWORD', 'SSH_KEY', 'API_KEY', 'BEARER_TOKEN', 'CUSTOM_HEADERS', 'HTTP', 'SIMULATOR');
CREATE TYPE "AgentStatus" AS ENUM ('UNKNOWN', 'ONLINE', 'OFFLINE', 'ERROR');
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "FindingSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'CONFIRMED', 'FALSE_POSITIVE', 'ACCEPTED', 'REMEDIATED', 'CLOSED');
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'DOCX');
CREATE TYPE "ReportStatus" AS ENUM ('QUEUED', 'GENERATING', 'READY', 'FAILED');
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'JOB', 'CONTRACT', 'FINDING', 'SYSTEM');
CREATE TYPE "AiProvider" AS ENUM ('OPENAI', 'AZURE_OPENAI', 'ANTHROPIC', 'OLLAMA', 'CUSTOM');

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "website" TEXT,
    "industry" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationContact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "type" "ContactType" NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "personName" TEXT,
    "personRole" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OrganizationContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Contract" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "scope" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContractAssignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "AssignmentRole" NOT NULL DEFAULT 'MEMBER',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ContractAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Asset" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "value" TEXT NOT NULL,
    "criticality" "Criticality" NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExecutionArm" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "connectionType" "AgentConnectionType" NOT NULL,
    "host" TEXT,
    "port" INTEGER,
    "encryptedCredentials" TEXT NOT NULL,
    "connectionConfig" JSONB NOT NULL DEFAULT '{}',
    "capabilities" JSONB NOT NULL DEFAULT '[]',
    "status" "AgentStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ExecutionArm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiEndpoint" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID,
    "name" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL DEFAULT 'CUSTOM',
    "baseUrl" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "encryptedApiKey" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "extraHeaders" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AiEndpoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MitreTactic" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mitreId" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "MitreTactic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MitreTechnique" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mitreId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isSubtechnique" BOOLEAN NOT NULL DEFAULT false,
    "parentMitreId" TEXT,
    "url" TEXT NOT NULL,
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tacticId" UUID NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "MitreTechnique_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ToolTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "isBuiltin" BOOLEAN NOT NULL DEFAULT false,
    "timeoutSec" INTEGER NOT NULL DEFAULT 300,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ToolTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Activity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "executionArmId" UUID,
    "toolTemplateId" UUID,
    "mitreTacticId" UUID,
    "mitreTechniqueId" UUID,
    "title" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "command" TEXT,
    "pythonCode" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "result" JSONB NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Finding" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "assetId" UUID,
    "activityId" UUID,
    "authorId" UUID NOT NULL,
    "mitreTechniqueId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "FindingSeverity" NOT NULL,
    "status" "FindingStatus" NOT NULL DEFAULT 'OPEN',
    "cvss" DECIMAL(3,1),
    "cwe" TEXT,
    "recommendation" TEXT,
    "references" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Evidence" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "findingId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Report" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "generatedById" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "format" "ReportFormat" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'QUEUED',
    "storagePath" TEXT,
    "errorMessage" TEXT,
    "options" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_status_idx" ON "Organization"("status");
CREATE INDEX "Organization_deletedAt_idx" ON "Organization"("deletedAt");

CREATE INDEX "OrganizationContact_organizationId_idx" ON "OrganizationContact"("organizationId");
CREATE INDEX "OrganizationContact_type_idx" ON "OrganizationContact"("type");

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

CREATE UNIQUE INDEX "Contract_organizationId_code_key" ON "Contract"("organizationId", "code");
CREATE INDEX "Contract_organizationId_status_idx" ON "Contract"("organizationId", "status");
CREATE INDEX "Contract_status_idx" ON "Contract"("status");
CREATE INDEX "Contract_deletedAt_idx" ON "Contract"("deletedAt");

CREATE UNIQUE INDEX "ContractAssignment_contractId_userId_key" ON "ContractAssignment"("contractId", "userId");
CREATE INDEX "ContractAssignment_userId_idx" ON "ContractAssignment"("userId");

CREATE INDEX "Asset_contractId_idx" ON "Asset"("contractId");
CREATE INDEX "Asset_organizationId_idx" ON "Asset"("organizationId");
CREATE INDEX "Asset_type_idx" ON "Asset"("type");
CREATE INDEX "Asset_criticality_idx" ON "Asset"("criticality");
CREATE INDEX "Asset_deletedAt_idx" ON "Asset"("deletedAt");

CREATE INDEX "ExecutionArm_organizationId_idx" ON "ExecutionArm"("organizationId");
CREATE INDEX "ExecutionArm_status_idx" ON "ExecutionArm"("status");
CREATE INDEX "ExecutionArm_deletedAt_idx" ON "ExecutionArm"("deletedAt");

CREATE INDEX "AiEndpoint_organizationId_idx" ON "AiEndpoint"("organizationId");
CREATE INDEX "AiEndpoint_isActive_idx" ON "AiEndpoint"("isActive");

CREATE UNIQUE INDEX "MitreTactic_mitreId_key" ON "MitreTactic"("mitreId");
CREATE UNIQUE INDEX "MitreTactic_shortName_key" ON "MitreTactic"("shortName");
CREATE INDEX "MitreTactic_sortOrder_idx" ON "MitreTactic"("sortOrder");

CREATE UNIQUE INDEX "MitreTechnique_mitreId_tacticId_key" ON "MitreTechnique"("mitreId", "tacticId");
CREATE INDEX "MitreTechnique_mitreId_idx" ON "MitreTechnique"("mitreId");
CREATE INDEX "MitreTechnique_tacticId_idx" ON "MitreTechnique"("tacticId");
CREATE INDEX "MitreTechnique_parentMitreId_idx" ON "MitreTechnique"("parentMitreId");
CREATE INDEX "MitreTechnique_isSubtechnique_idx" ON "MitreTechnique"("isSubtechnique");

CREATE UNIQUE INDEX "ToolTemplate_organizationId_slug_key" ON "ToolTemplate"("organizationId", "slug");
CREATE INDEX "ToolTemplate_tool_idx" ON "ToolTemplate"("tool");

CREATE INDEX "Activity_organizationId_contractId_idx" ON "Activity"("organizationId", "contractId");
CREATE INDEX "Activity_assetId_idx" ON "Activity"("assetId");
CREATE INDEX "Activity_status_idx" ON "Activity"("status");
CREATE INDEX "Activity_authorId_idx" ON "Activity"("authorId");
CREATE INDEX "Activity_mitreTacticId_mitreTechniqueId_idx" ON "Activity"("mitreTacticId", "mitreTechniqueId");
CREATE INDEX "Activity_deletedAt_idx" ON "Activity"("deletedAt");

CREATE INDEX "Finding_organizationId_contractId_idx" ON "Finding"("organizationId", "contractId");
CREATE INDEX "Finding_severity_status_idx" ON "Finding"("severity", "status");
CREATE INDEX "Finding_deletedAt_idx" ON "Finding"("deletedAt");

CREATE INDEX "Evidence_findingId_idx" ON "Evidence"("findingId");

CREATE INDEX "Report_contractId_idx" ON "Report"("contractId");
CREATE INDEX "Report_status_idx" ON "Report"("status");

CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- AddForeignKey
ALTER TABLE "OrganizationContact" ADD CONSTRAINT "OrganizationContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Contract" ADD CONSTRAINT "Contract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContractAssignment" ADD CONSTRAINT "ContractAssignment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContractAssignment" ADD CONSTRAINT "ContractAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Asset" ADD CONSTRAINT "Asset_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExecutionArm" ADD CONSTRAINT "ExecutionArm_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiEndpoint" ADD CONSTRAINT "AiEndpoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MitreTechnique" ADD CONSTRAINT "MitreTechnique_tacticId_fkey" FOREIGN KEY ("tacticId") REFERENCES "MitreTactic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ToolTemplate" ADD CONSTRAINT "ToolTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Activity" ADD CONSTRAINT "Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_executionArmId_fkey" FOREIGN KEY ("executionArmId") REFERENCES "ExecutionArm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_toolTemplateId_fkey" FOREIGN KEY ("toolTemplateId") REFERENCES "ToolTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_mitreTacticId_fkey" FOREIGN KEY ("mitreTacticId") REFERENCES "MitreTactic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_mitreTechniqueId_fkey" FOREIGN KEY ("mitreTechniqueId") REFERENCES "MitreTechnique"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Finding" ADD CONSTRAINT "Finding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_mitreTechniqueId_fkey" FOREIGN KEY ("mitreTechniqueId") REFERENCES "MitreTechnique"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Report" ADD CONSTRAINT "Report_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
