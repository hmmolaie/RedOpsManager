import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_AGENT_CHECK, QUEUE_REPORT, QUEUE_SCAN } from './queue.constants';
import { ExecutionEngine } from './execution.engine';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', '127.0.0.1'),
          port: Number(config.get('REDIS_PORT', 6379)),
          password: config.get('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_SCAN },
      { name: QUEUE_REPORT },
      { name: QUEUE_AGENT_CHECK },
    ),
  ],
  providers: [ExecutionEngine],
  exports: [BullModule, ExecutionEngine],
})
export class QueueCoreModule {}
