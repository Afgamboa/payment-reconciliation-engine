import { PaymentStatus } from '../common/enum/payment-status.enum.js';
import { TransientError } from '../common/errors/processing.errors.js';
import { InMemoryPaymentRepository } from '../../test/support/in-memory-payment.repository.js';
import { PaymentService } from '../payments/payment.service.js';
import type { ProviderRegistry } from '../providers/provider.registry.js';
import { ReconciliationService } from './reconciliation.service.js';

describe('ReconciliationService', () => {
  const getPaymentStatus = vi.fn();
  const providers = {
    resolve: () => ({ getPaymentStatus }),
  } as unknown as ProviderRegistry;
  const config = {
    getOrThrow: (key: string) =>
      key === 'reconciliation.stuckAfterMs' ? 0 : 50,
  };

  let repository: InMemoryPaymentRepository;
  let service: ReconciliationService;

  const seedStuckPayment = async (status: PaymentStatus) => {
    const payments = new PaymentService(repository);
    await payments.applyStatusChange({
      provider: 'WOMPI',
      providerPaymentId: 'pay-1',
      amount: 1000,
      currency: 'COP',
      status,
      occurredAt: new Date('2026-11-18T14:00:00Z'),
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new InMemoryPaymentRepository();
    service = new ReconciliationService(
      new PaymentService(repository),
      providers,
      config as never,
    );
  });

  it('corrects a stuck payment and does nothing on the next run', async () => {
    await seedStuckPayment(PaymentStatus.PENDING);
    getPaymentStatus.mockResolvedValue({
      status: PaymentStatus.COMPLETED,
      occurredAt: new Date(),
    });

    const first = await service.run();
    const second = await service.run();

    expect(first).toMatchObject({ checked: 1, corrected: 1 });
    expect(second.checked).toBe(0);
    expect(getPaymentStatus).toHaveBeenCalledOnce();
  });

  it('does not rewrite a payment already in sync with the provider', async () => {
    await seedStuckPayment(PaymentStatus.PROCESSING);
    getPaymentStatus.mockResolvedValue({
      status: PaymentStatus.PROCESSING,
      occurredAt: new Date(),
    });

    expect(await service.run()).toMatchObject({ inSync: 1, corrected: 0 });
  });

  it('leaves unknown provider statuses unresolved for review', async () => {
    await seedStuckPayment(PaymentStatus.PENDING);
    getPaymentStatus.mockResolvedValue({
      status: 'REFUNDED',
      occurredAt: new Date(),
    });

    expect(await service.run()).toMatchObject({ unresolved: 1, corrected: 0 });
  });

  it('reports provider failures without aborting the run', async () => {
    await seedStuckPayment(PaymentStatus.PENDING);
    getPaymentStatus.mockRejectedValue(new TransientError('provider down'));

    expect(await service.run()).toMatchObject({ checked: 1, failed: 1 });
  });
});
