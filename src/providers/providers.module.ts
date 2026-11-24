import { Module } from '@nestjs/common';
import { PaymentProvider } from '../common/enum/payment-provider.enum.js';
import { MockPaymentProviderAdapter } from './mock-payment-provider.adapter.js';
import { PAYMENT_PROVIDER_ADAPTERS } from './payment-provider.adapter.js';
import { ProviderRegistry } from './provider.registry.js';

@Module({
  providers: [
    MockPaymentProviderAdapter,
    {
      provide: PAYMENT_PROVIDER_ADAPTERS,
      useFactory: (mock: MockPaymentProviderAdapter) =>
        Object.fromEntries(
          Object.values(PaymentProvider).map((provider) => [provider, mock]),
        ),
      inject: [MockPaymentProviderAdapter],
    },
    ProviderRegistry,
  ],
  exports: [ProviderRegistry],
})
export class ProvidersModule {}
