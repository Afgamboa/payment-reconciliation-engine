export const PAYMENT_REPOSITORY = 'PAYMENT_REPOSITORY';

export interface Payment {
  id: string;
  provider: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: string;
  lastEventAt: Date;
  updatedAt: Date;
}

export type NewPayment = Omit<Payment, 'id' | 'updatedAt'>;

export type PaymentTransition = Pick<Payment, 'status' | 'lastEventAt'>;

export interface PaymentStatusChange
  extends Pick<
    Payment,
    'provider' | 'providerPaymentId' | 'amount' | 'currency' | 'status'
  > {
  occurredAt: Date;
}

export interface PaymentRepository {
  findById(id: string): Promise<Payment | null>;

  findByProviderPaymentId(
    provider: string,
    providerPaymentId: string,
  ): Promise<Payment | null>;

  /** Returns null when another request created the payment first. */
  createIfAbsent(data: NewPayment): Promise<Payment | null>;

  /** Optimistic update: returns false if the payment changed since it was read. */
  transition(payment: Payment, change: PaymentTransition): Promise<boolean>;

  findStuck(
    statuses: string[],
    updatedBefore: Date,
    limit: number,
  ): Promise<Payment[]>;
}
