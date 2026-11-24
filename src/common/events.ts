export const PAYMENTS_QUEUE = 'payments.events';

export const PAYMENT_EVENT_PATTERN = 'payment_event';

export interface PaymentEventMessage {
  id: string;
  provider: string;
}
