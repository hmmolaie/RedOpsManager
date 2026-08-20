import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { AuditModule } from './common/audit/audit.module';
import { QueueCoreModule } from './modules/queue/queue.module';
import { WorkerProcessorsModule } from './modules/queue/worker-processors.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CryptoModule,
    AuditModule,
    QueueCoreModule,
    NotificationsModule,
    WorkerProcessorsModule,
  ],
})
class WorkerModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  console.log('RedOps worker started — consuming scan, report, and agent-check queues');
  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap();
