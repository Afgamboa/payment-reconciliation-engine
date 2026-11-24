import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '../common/enum/payment-status.enum.js';
import { TransientError } from '../common/errors/processing.errors.js';
import type {
  PaymentProviderAdapter,
  ProviderPaymentStatus,
} from './payment-provider.adapter.js';

// Simulated source of truth: every payment is COMPLETED on the provider side,
// and calls can fail at MOCK_PROVIDER_FAILURE_RATE to exercise the error paths.
@Injectable()
export class MockPaymentProviderAdapter implements PaymentProviderAdapter {
  constructor(private readonly config: ConfigService) {}

  async getPaymentStatus(): Promise<ProviderPaymentStatus> {
    const failureRate = this.config.getOrThrow<number>(
      'mockProvider.failureRate',
    );

    if (Math.random() < failureRate) {
      throw new TransientError('Provider temporarily unavailable');
    }

    return { status: PaymentStatus.COMPLETED, occurredAt: new Date() };
  }
}
