import { Injectable } from '@nestjs/common';
import { EventStatus } from '../../common/enum/event-status.enum.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  AttemptResult,
  EventQueueRepository,
  QueuedEvent,
} from '../interfaces/event-queue.repository.js';

@Injectable()
export class PrismaEventQueueRepository implements EventQueueRepository {
  constructor(private readonly prisma: PrismaService) {}

  claimBatch(limit: number, leaseMs: number): Promise<QueuedEvent[]> {
    return this.prisma.$queryRaw<QueuedEvent[]>`
      WITH claimed AS (
        UPDATE "Webhooks_Events"
        SET status = ${EventStatus.PROCESSING},
            attempts = attempts + 1,
            "nextRetryAt" = timezone('utc', now())
              + make_interval(secs => ${leaseMs / 1000}::double precision)
        WHERE id IN (
          SELECT id FROM "Webhooks_Events"
          WHERE (
              status IN (${EventStatus.RECEIVED}, ${EventStatus.RETRY_PENDING})
              AND ("nextRetryAt" IS NULL OR "nextRetryAt" <= timezone('utc', now()))
            )
            OR (
              status = ${EventStatus.PROCESSING}
              AND "nextRetryAt" <= timezone('utc', now())
            )
          ORDER BY "receivedAt"
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id, provider, "eventId", "paymentId", "rawPayload",
                  "occurredAt", "correlationId", attempts
      ),
      started AS (
        INSERT INTO "Payment_Attempts" (id, "eventId", "attemptNumber")
        SELECT gen_random_uuid()::text, id, attempts FROM claimed
      )
      SELECT * FROM claimed`;
  }

  async finishAttempt(
    event: QueuedEvent,
    result: AttemptResult,
  ): Promise<void> {
    const error = result.error ?? null;

    await this.prisma.$transaction([
      this.prisma.webhooks_Events.updateMany({
        where: {
          id: event.id,
          attempts: event.attempts,
          status: EventStatus.PROCESSING,
        },
        data: {
          status: result.status,
          lastError: error,
          nextRetryAt: result.nextRetryAt ?? null,
        },
      }),
      this.prisma.payment_Attempts.updateMany({
        where: { eventId: event.id, attemptNumber: event.attempts },
        data: { finishedAt: new Date(), outcome: result.outcome, error },
      }),
    ]);
  }
}
