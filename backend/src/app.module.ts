import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { AuditModule } from './common/audit/audit.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { QueueCoreModule } from './modules/queue/queue.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { AssetsModule } from './modules/assets/assets.module';
import { AgentsModule } from './modules/agents/agents.module';
import { AiModule } from './modules/ai/ai.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { FindingsModule } from './modules/findings/findings.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { MitreModule } from './modules/mitre/mitre.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ToolsModule } from './modules/tools/tools.module';
import { AuditLogModule } from './modules/audit/audit-log.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    PrismaModule,
    CryptoModule,
    AuditModule,
    QueueCoreModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ContractsModule,
    AssetsModule,
    AgentsModule,
    AiModule,
    ActivitiesModule,
    FindingsModule,
    EvidenceModule,
    MitreModule,
    ReportsModule,
    NotificationsModule,
    DashboardModule,
    ToolsModule,
    AuditLogModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
