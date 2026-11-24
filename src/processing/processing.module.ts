import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PaymentsModule } from '../payments/payment.module.js';
import { PaymentConsumer } from './consumer/payment-consumer.js';
import { EventProcessor } from './event-processor.service.js';
import { EventWorker } from './event-worker.service.js';
import { EVENT_QUEUE_REPOSITORY } from './interfaces/event-queue.repository.js';
import { PrismaEventQueueRepository } from './repository/event-queue-prisma.repository.js';
import { ExponentialBackoffRetryPolicy, RETRY_POLICY } from './retry-policy.js';

@Module({
  imports: [PrismaModule, PaymentsModule],
  controllers: [PaymentConsumer],
  providers: [
    EventProcessor,
    EventWorker,
    { provide: EVENT_QUEUE_REPOSITORY, useClass: PrismaEventQueueRepository },
    {
      provide: RETRY_POLICY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new ExponentialBackoffRetryPolicy(
          config.getOrThrow<number>('retry.maxAttempts'),
          config.getOrThrow<number>('retry.baseDelayMs'),
          config.getOrThrow<number>('retry.maxDelayMs'),
        ),
    },
  ],
  exports: [EventProcessor, EventWorker],
})
export class ProcessingModule {}
