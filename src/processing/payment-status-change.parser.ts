import { PermanentError } from '../common/errors/processing.errors.js';
import type { PaymentStatusChange } from '../payments/interfaces/payment.repository.js';
import type { QueuedEvent } from './interfaces/event-queue.repository.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The stored payload comes from outside, so it is narrowed from `unknown`
// before use instead of being trusted just because it passed validation once.
export const toPaymentStatusChange = (
  event: QueuedEvent,
): PaymentStatusChange => {
  const payload = event.rawPayload;

  if (
    !isRecord(payload) ||
    typeof payload.status !== 'string' ||
    typeof payload.amount !== 'number' ||
    typeof payload.currency !== 'string'
  ) {
    throw new PermanentError(`Stored payload of event ${event.id} is malformed`);
  }

  return {
    provider: event.provider,
    providerPaymentId: event.paymentId,
    status: payload.status,
    amount: payload.amount,
    currency: payload.currency,
    occurredAt: event.occurredAt,
  };
};
