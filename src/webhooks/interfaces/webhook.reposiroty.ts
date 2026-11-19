import { Prisma } from '../../generated/prisma/index.js';

export interface WebhookRepository {
  create(data: CreateWebhookEvent): Promise<WebhookEvent>;

  findByEventAndPayment(
    eventIdf: string,
    paymentId: string,
  ): Promise<WebhookEvent | null>;
}

export interface WebhookEvent {
  eventId: string;
  paymentId: string;
  provider: string;
  rawPayload: Prisma.JsonValue | Prisma.InputJsonValue;
  attempts: number;
  status: string;
  receivedAt: Date;
  nextRetryAt: Date | null;
}

export interface CreateWebhookEvent {
  eventId: string;
  paymentId: string;
  provider: string;
  rawPayload: Prisma.InputJsonValue;
  attempts: number;
  status: string;
  nextRetryAt?: Date | null;
}
