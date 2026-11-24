import { randomUUID } from 'node:crypto';
import type {
  NewPayment,
  Payment,
  PaymentRepository,
  PaymentTransition,
} from '../../src/payments/interfaces/payment.repository.js';

export class InMemoryPaymentRepository implements PaymentRepository {
  readonly payments = new Map<string, Payment>();

  async findById(id: string) {
    return this.payments.get(id) ?? null;
  }

  async findByProviderPaymentId(provider: string, providerPaymentId: string) {
    return (
      [...this.payments.values()].find(
        (payment) =>
          payment.provider === provider &&
          payment.providerPaymentId === providerPaymentId,
      ) ?? null
    );
  }

  async createIfAbsent(data: NewPayment) {
    if (await this.findByProviderPaymentId(data.provider, data.providerPaymentId)) {
      return null;
    }
    const payment = { ...data, id: randomUUID(), updatedAt: new Date() };
    this.payments.set(payment.id, payment);
    return payment;
  }

  async transition(payment: Payment, change: PaymentTransition) {
    const stored = this.payments.get(payment.id);
    if (!stored || stored.lastEventAt.getTime() !== payment.lastEventAt.getTime()) {
      return false;
    }
    this.payments.set(payment.id, { ...stored, ...change, updatedAt: new Date() });
    return true;
  }

  async findStuck(statuses: string[], updatedBefore: Date, limit: number) {
    return [...this.payments.values()]
      .filter(
        (payment) =>
          statuses.includes(payment.status) && payment.updatedAt < updatedBefore,
      )
      .slice(0, limit);
  }
}
