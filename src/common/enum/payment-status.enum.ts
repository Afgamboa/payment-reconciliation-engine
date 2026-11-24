export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export const isPaymentStatus = (value: string): value is PaymentStatus =>
  Object.values<string>(PaymentStatus).includes(value);
