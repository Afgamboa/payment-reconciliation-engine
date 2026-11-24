import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '../common/enum/payment-status.enum.js';
import { ProcessingOutcome } from '../common/enum/processing-outcome.enum.js';
import type { Payment } from '../payments/interfaces/payment.repository.js';
import { PaymentService } from '../payments/payment.service.js';
import { ProviderRegistry } from '../providers/provider.registry.js';

const STUCK_STATUSES = [PaymentStatus.PENDING, PaymentStatus.PROCESSING];

type PaymentResult = 'IN_SYNC' | 'CORRECTED' | 'UNRESOLVED';

export interface ReconciliationReport {
  checked: number;
  inSync: number;
  corrected: number;
  unresolved: number;
  failed: number;
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly payments: PaymentService,
    private readonly providers: ProviderRegistry,
    private readonly config: ConfigService,
  ) {}

  /**
   * Safe to run repeatedly: a corrected payment leaves the stuck set, and a
   * correction goes through the same idempotent path as webhook events.
   */
  async run(): Promise<ReconciliationReport> {
    const stuckAfterMs = this.config.getOrThrow<number>(
      'reconciliation.stuckAfterMs',
    );
    const stuck = await this.payments.findStuck(
      STUCK_STATUSES,
      new Date(Date.now() - stuckAfterMs),
      this.config.getOrThrow<number>('reconciliation.batchSize'),
    );

    const results = await Promise.allSettled(
      stuck.map((payment) => this.reconcile(payment)),
    );

    const report: ReconciliationReport = {
      checked: stuck.length,
      inSync: 0,
      corrected: 0,
      unresolved: 0,
      failed: 0,
    };

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        report.failed++;
        this.logger.error({
          message: 'reconciliation.failed',
          paymentId: stuck[index].providerPaymentId,
          provider: stuck[index].provider,
          error: String(result.reason),
        });
        return;
      }

      if (result.value === 'IN_SYNC') report.inSync++;
      if (result.value === 'CORRECTED') report.corrected++;
      if (result.value === 'UNRESOLVED') report.unresolved++;
    });

    this.logger.log({ message: 'reconciliation.finished', ...report });
    return report;
  }

  private async reconcile(payment: Payment): Promise<PaymentResult> {
    const remote = await this.providers
      .resolve(payment.provider)
      .getPaymentStatus(payment.providerPaymentId);

    if (remote.status === payment.status) {
      return 'IN_SYNC';
    }

    this.logger.warn({
      message: 'reconciliation.discrepancy',
      paymentId: payment.providerPaymentId,
      provider: payment.provider,
      localStatus: payment.status,
      providerStatus: remote.status,
    });

    const outcome = await this.payments.applyStatusChange({
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
      amount: payment.amount,
      currency: payment.currency,
      status: remote.status,
      occurredAt: remote.occurredAt,
    });

    return outcome === ProcessingOutcome.APPLIED ? 'CORRECTED' : 'UNRESOLVED';
  }
}
