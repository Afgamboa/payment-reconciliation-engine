import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventStatus } from '../common/enum/event-status.enum.js';
import { ProcessingOutcome } from '../common/enum/processing-outcome.enum.js';
import { PermanentError } from '../common/errors/processing.errors.js';
import { MetricsService } from '../metrics/metrics.service.js';
import { PaymentService } from '../payments/payment.service.js';
import {
  EVENT_QUEUE_REPOSITORY,
  type AttemptResult,
  type EventQueueRepository,
  type QueuedEvent,
} from './interfaces/event-queue.repository.js';
import { toPaymentStatusChange } from './payment-status-change.parser.js';
import { RETRY_POLICY, type RetryPolicy } from './retry-policy.js';

@Injectable()
export class EventProcessor {
  private readonly logger = new Logger(EventProcessor.name);

  constructor(
    @Inject(EVENT_QUEUE_REPOSITORY)
    private readonly queue: EventQueueRepository,
    @Inject(RETRY_POLICY) private readonly retryPolicy: RetryPolicy,
    private readonly payments: PaymentService,
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Claims and processes one batch. The batch size is the concurrency limit:
   * the next batch is only claimed after every event of this one settled.
   * Returns how many events were claimed.
   */
  async processNextBatch(): Promise<number> {
    const events = await this.queue.claimBatch(
      this.config.getOrThrow<number>('worker.concurrency'),
      this.config.getOrThrow<number>('worker.leaseMs'),
    );

    // allSettled: one failing event must not hide or abort the rest of the batch.
    const results = await Promise.allSettled(
      events.map((event) => this.process(event)),
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error({
          message: 'event.unsettled',
          eventId: events[index].eventId,
          correlationId: events[index].correlationId,
          error: String(result.reason),
        });
      }
    });

    return events.length;
  }

  private async process(event: QueuedEvent): Promise<void> {
    const stopTimer = this.metrics.startProcessingTimer();

    try {
      const outcome = await this.payments.applyStatusChange(
        toPaymentStatusChange(event),
      );

      await this.queue.finishAttempt(event, {
        status:
          outcome === ProcessingOutcome.NEEDS_REVIEW
            ? EventStatus.NEEDS_REVIEW
            : EventStatus.PROCESSED,
        outcome,
      });

      this.metrics.eventProcessed(outcome);
      this.log('event.processed', event, { outcome });
    } catch (error) {
      await this.handleFailure(event, error);
    } finally {
      stopTimer();
    }
  }

  private async handleFailure(
    event: QueuedEvent,
    error: unknown,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    const result = this.nextStateAfterFailure(event, error, message);

    await this.queue.finishAttempt(event, result);

    this.metrics.eventFailed();
    if (result.status === EventStatus.DEAD_LETTER) {
      this.metrics.eventDeadLettered();
    } else {
      this.metrics.eventRetried();
    }
    this.log('event.failed', event, { status: result.status, error: message });
  }

  // Permanent business errors skip the retries; anything else is assumed transient.
  private nextStateAfterFailure(
    event: QueuedEvent,
    error: unknown,
    message: string,
  ): AttemptResult {
    const base = { outcome: ProcessingOutcome.FAILED, error: message };

    if (
      error instanceof PermanentError ||
      event.attempts >= this.retryPolicy.maxAttempts
    ) {
      return { ...base, status: EventStatus.DEAD_LETTER };
    }

    return {
      ...base,
      status: EventStatus.RETRY_PENDING,
      nextRetryAt: new Date(
        Date.now() + this.retryPolicy.nextDelayMs(event.attempts),
      ),
    };
  }

  private log(message: string, event: QueuedEvent, extra: object) {
    this.logger.log({
      message,
      eventId: event.eventId,
      paymentId: event.paymentId,
      provider: event.provider,
      attempt: event.attempts,
      correlationId: event.correlationId,
      ...extra,
    });
  }
}
