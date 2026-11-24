import { PaymentStatus } from '../common/enum/payment-status.enum.js';
import { ProcessingOutcome } from '../common/enum/processing-outcome.enum.js';
import { TransientError } from '../common/errors/processing.errors.js';
import { InMemoryPaymentRepository } from '../../test/support/in-memory-payment.repository.js';
import type { PaymentStatusChange } from './interfaces/payment.repository.js';
import { PaymentService } from './payment.service.js';

const change = (
  status: string,
  occurredAt: string,
): PaymentStatusChange => ({
  provider: 'WOMPI',
  providerPaymentId: 'pay-1',
  amount: 1000,
  currency: 'COP',
  status,
  occurredAt: new Date(occurredAt),
});

describe('PaymentService.applyStatusChange', () => {
  let repository: InMemoryPaymentRepository;
  let service: PaymentService;

  const currentStatus = async () =>
    (await repository.findByProviderPaymentId('WOMPI', 'pay-1'))?.status;

  beforeEach(() => {
    repository = new InMemoryPaymentRepository();
    service = new PaymentService(repository);
  });

  it('creates the payment and completes it on a COMPLETED event', async () => {
    await service.applyStatusChange(change('PENDING', '2026-11-18T14:00:00Z'));
    const outcome = await service.applyStatusChange(
      change('COMPLETED', '2026-11-18T14:05:00Z'),
    );

    expect(outcome).toBe(ProcessingOutcome.APPLIED);
    expect(await currentStatus()).toBe(PaymentStatus.COMPLETED);
  });

  it('does not move a COMPLETED payment back to PENDING with an older event', async () => {
    await service.applyStatusChange(change('COMPLETED', '2026-11-18T14:05:00Z'));
    const outcome = await service.applyStatusChange(
      change('PENDING', '2026-11-18T14:00:00Z'),
    );

    expect(outcome).toBe(ProcessingOutcome.IGNORED);
    expect(await currentStatus()).toBe(PaymentStatus.COMPLETED);
  });

  it('rejects an invalid transition even if the event is newer', async () => {
    await service.applyStatusChange(change('COMPLETED', '2026-11-18T14:00:00Z'));
    const outcome = await service.applyStatusChange(
      change('PENDING', '2026-11-18T15:00:00Z'),
    );

    expect(outcome).toBe(ProcessingOutcome.IGNORED);
    expect(await currentStatus()).toBe(PaymentStatus.COMPLETED);
  });

  it('is idempotent when the same event is replayed', async () => {
    await service.applyStatusChange(change('COMPLETED', '2026-11-18T14:00:00Z'));
    const outcome = await service.applyStatusChange(
      change('COMPLETED', '2026-11-18T14:00:00Z'),
    );

    expect(outcome).toBe(ProcessingOutcome.IGNORED);
  });

  it('reports unknown statuses for review without touching the payment', async () => {
    await service.applyStatusChange(change('PENDING', '2026-11-18T14:00:00Z'));
    const outcome = await service.applyStatusChange(
      change('REFUNDED', '2026-11-18T15:00:00Z'),
    );

    expect(outcome).toBe(ProcessingOutcome.NEEDS_REVIEW);
    expect(await currentStatus()).toBe(PaymentStatus.PENDING);
  });

  it('raises a transient error when the payment changed concurrently', async () => {
    await service.applyStatusChange(change('PENDING', '2026-11-18T14:00:00Z'));
    vi.spyOn(repository, 'transition').mockResolvedValue(false);

    await expect(
      service.applyStatusChange(change('COMPLETED', '2026-11-18T15:00:00Z')),
    ).rejects.toBeInstanceOf(TransientError);
  });
});
