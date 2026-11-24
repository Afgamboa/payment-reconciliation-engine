import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { isPaymentStatus } from '../common/enum/payment-status.enum.js';
import { ProcessingOutcome } from '../common/enum/processing-outcome.enum.js';
import { TransientError } from '../common/errors/processing.errors.js';
import {
  PAYMENT_REPOSITORY,
  type Payment,
  type PaymentRepository,
  type PaymentStatusChange,
} from './interfaces/payment.repository.js';
import { PaymentStateMachine } from './payment-state-machine.js';

@Injectable()
export class PaymentService {
  private readonly stateMachine = new PaymentStateMachine();

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly repository: PaymentRepository,
  ) {}

  async getById(id: string): Promise<Payment> {
    const payment = await this.repository.findById(id);
    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }
    return payment;
  }

  findStuck(statuses: string[], updatedBefore: Date, limit: number) {
    return this.repository.findStuck(statuses, updatedBefore, limit);
  }

  /**
   * Applies a status change idempotently: replaying the same change, or an older
   * one, never moves the payment. Unknown statuses are reported, never applied.
   */
  async applyStatusChange(
    change: PaymentStatusChange,
  ): Promise<ProcessingOutcome> {
    if (!isPaymentStatus(change.status)) {
      return ProcessingOutcome.NEEDS_REVIEW;
    }

    const current = await this.repository.findByProviderPaymentId(
      change.provider,
      change.providerPaymentId,
    );

    if (!current) {
      return this.createPayment(change);
    }

    if (!isPaymentStatus(current.status)) {
      return ProcessingOutcome.NEEDS_REVIEW;
    }

    const isNewer = change.occurredAt > current.lastEventAt;
    if (!isNewer || !this.stateMachine.canTransition(current.status, change.status)) {
      return ProcessingOutcome.IGNORED;
    }

    const updated = await this.repository.transition(current, {
      status: change.status,
      lastEventAt: change.occurredAt,
    });
    if (!updated) {
      throw new TransientError(
        `Payment ${current.id} was modified concurrently`,
      );
    }

    return ProcessingOutcome.APPLIED;
  }

  private async createPayment(
    change: PaymentStatusChange,
  ): Promise<ProcessingOutcome> {
    const created = await this.repository.createIfAbsent({
      provider: change.provider,
      providerPaymentId: change.providerPaymentId,
      amount: change.amount,
      currency: change.currency,
      status: change.status,
      lastEventAt: change.occurredAt,
    });
    if (!created) {
      throw new TransientError(
        `Payment ${change.providerPaymentId} was created concurrently`,
      );
    }

    return ProcessingOutcome.APPLIED;
  }
}
