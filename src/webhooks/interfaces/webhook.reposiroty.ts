import { Prisma } from '../../generated/prisma/index.js';

export const WEBHOOK_REPOSITORY = 'WEBHOOK_REPOSITORY';

export interface WebhookEvent {
  id: string;
  provider: string;
  eventId: string;
  paymentId: string;
  type: string;
  status: string;
  rawPayload: Prisma.JsonValue;
  occurredAt: Date;
  correlationId: string;
  attempts: number;
  lastError: string | null;
  receivedAt: Date;
  nextRetryAt: Date | null;
}

export interface PaymentAttempt {
  attemptNumber: number;
  startedAt: Date;
  finishedAt: Date | null;
  outcome: string | null;
  error: string | null;
}

export type WebhookEventDetail = WebhookEvent & {
  attemptsLog: PaymentAttempt[];
};

export type NewWebhookEvent = Pick<
  WebhookEvent,
  | 'provider'
  | 'eventId'
  | 'paymentId'
  | 'type'
  | 'occurredAt'
  | 'correlationId'
> & { rawPayload: Prisma.InputJsonValue };

export interface CreateWebhookResult {
  event: WebhookEvent;
  created: boolean;
}

export interface WebhookRepository {
  /** Stores the event, or returns the existing one when (provider, eventId) is a duplicate. */
  create(data: NewWebhookEvent): Promise<CreateWebhookResult>;

  findById(id: string): Promise<WebhookEventDetail | null>;
}
