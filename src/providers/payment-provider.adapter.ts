export const PAYMENT_PROVIDER_ADAPTERS = 'PAYMENT_PROVIDER_ADAPTERS';

export interface ProviderPaymentStatus {
  status: string;
  occurredAt: Date;
}

// Adapter pattern: the domain talks to this interface only, and each provider's
// API format stays inside its own adapter.
export interface PaymentProviderAdapter {
  getPaymentStatus(providerPaymentId: string): Promise<ProviderPaymentStatus>;
}
