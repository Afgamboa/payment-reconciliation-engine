import { EventStatus } from '../../common/enum/event-status.enum.js';
import { ProcessingOutcome } from '../../common/enum/processing-outcome.enum.js';

export const EVENT_QUEUE_REPOSITORY = 'EVENT_QUEUE_REPOSITORY';

export interface QueuedEvent {
  id: string;
  provider: string;
  eventId: string;
  paymentId: string;
  rawPayload: unknown;
  occurredAt: Date;
  correlationId: string;
  attempts: number;
}

export interface AttemptResult {
  status: EventStatus;
  outcome: ProcessingOutcome;
  error?: string;
  nextRetryAt?: Date;
}

export interface EventQueueRepository {
  /**
   * Atomically claims up to `limit` due events, so two workers never get the
   * same one. A claim is a lease: if the worker dies, the event becomes due
   * again once `leaseMs` has passed.
   */
  claimBatch(limit: number, leaseMs: number): Promise<QueuedEvent[]>;

  finishAttempt(event: QueuedEvent, result: AttemptResult): Promise<void>;
}
