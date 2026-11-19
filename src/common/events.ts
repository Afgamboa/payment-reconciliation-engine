export const PAYMENTS_QUEUE = 'payments.events';

export interface PaymentStatusEvent {
  eventId: string;
  paymentId: string;
  provider: string;
  status: string;
  occurredAt: string;
}