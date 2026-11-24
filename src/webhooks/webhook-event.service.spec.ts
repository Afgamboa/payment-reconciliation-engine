import { NotFoundException } from '@nestjs/common';
import {
  WebhookEventDto,
  WebhookEventType,
} from './dtos/webhook-event.dto.js';
import type {
  WebhookEvent,
  WebhookRepository,
} from './interfaces/webhook.reposiroty.js';
import { WebhookService } from './webhook-event.service.js';

const dto: WebhookEventDto = {
  eventId: 'evt-1',
  paymentId: 'pay-1',
  type: WebhookEventType.PAYMENT_STATUS_CHANGED,
  status: 'COMPLETED',
  amount: 1000,
  currency: 'COP',
  occurredAt: '2026-11-18T14:00:00.000Z',
};

const storedEvent = { id: 'id-1', eventId: 'evt-1', paymentId: 'pay-1' } as WebhookEvent;

describe('WebhookService', () => {
  const repository = {
    create: vi.fn(),
    findById: vi.fn(),
  } satisfies WebhookRepository;
  const publisher = { notify: vi.fn() };
  const metrics = { eventReceived: vi.fn(), eventDuplicated: vi.fn() };
  const service = new WebhookService(
    repository,
    publisher as never,
    metrics as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores a new event and notifies the worker', async () => {
    repository.create.mockResolvedValue({ event: storedEvent, created: true });

    const receipt = await service.receive('WOMPI', dto, 'corr-1');

    expect(receipt).toEqual({ id: 'id-1', status: 'ACCEPTED' });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'WOMPI',
        correlationId: 'corr-1',
        occurredAt: new Date(dto.occurredAt),
        rawPayload: dto,
      }),
    );
    expect(publisher.notify).toHaveBeenCalledOnce();
  });

  it('answers safely to a duplicate without notifying again', async () => {
    repository.create.mockResolvedValue({ event: storedEvent, created: false });

    const receipt = await service.receive('WOMPI', dto, 'corr-1');

    expect(receipt).toEqual({ id: 'id-1', status: 'DUPLICATE' });
    expect(publisher.notify).not.toHaveBeenCalled();
    expect(metrics.eventDuplicated).toHaveBeenCalledOnce();
  });

  it('throws NotFound for an unknown event id', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getEvent('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
