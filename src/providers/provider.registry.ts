import { Inject, Injectable } from '@nestjs/common';
import { PermanentError } from '../common/errors/processing.errors.js';
import {
  PAYMENT_PROVIDER_ADAPTERS,
  type PaymentProviderAdapter,
} from './payment-provider.adapter.js';

@Injectable()
export class ProviderRegistry {
  constructor(
    @Inject(PAYMENT_PROVIDER_ADAPTERS)
    private readonly adapters: Record<string, PaymentProviderAdapter>,
  ) {}

  resolve(provider: string): PaymentProviderAdapter {
    const adapter = this.adapters[provider];
    if (!adapter) {
      throw new PermanentError(`No adapter registered for ${provider}`);
    }
    return adapter;
  }
}
