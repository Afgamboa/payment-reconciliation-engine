import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MetricsService } from '../metrics/metrics.service.js';
import { EventPublisher } from '../messaging/rabbitmq.publisher.js';
import { WebhookEventDto } from './dtos/webhook-event.dto.js';
import {
  WEBHOOK_REPOSITORY,
  type WebhookEventDetail,
  type WebhookRepository,
} from './interfaces/webhook.reposiroty.js';

export interface WebhookReceipt {
  id: string;
  status: 'ACCEPTED' | 'DUPLICATE';
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @Inject(WEBHOOK_REPOSITORY)
    private readonly repository: WebhookRepository,
    private readonly publisher: EventPublisher,
    private readonly metrics: MetricsService,
  ) {}

  async receive(
    provider: string,
    dto: WebhookEventDto,
    correlationId: string,
  ): Promise<WebhookReceipt> {
    const { event, created } = await this.repository.create({
      provider,
      eventId: dto.eventId,
      paymentId: dto.paymentId,
      type: dto.type,
      occurredAt: new Date(dto.occurredAt),
      correlationId,
      rawPayload: { ...dto },
    });

    const logContext = {
      eventId: event.eventId,
      paymentId: event.paymentId,
      provider,
      correlationId,
    };

    if (!created) {
      this.metrics.eventDuplicated();
      this.logger.warn({ message: 'webhook.duplicate', ...logContext });
      return { id: event.id, status: 'DUPLICATE' };
    }

    this.metrics.eventReceived();
    this.logger.log({ message: 'webhook.received', ...logContext });
    await this.publisher.notify({ id: event.id, provider });

    return { id: event.id, status: 'ACCEPTED' };
  }

  async getEvent(id: string): Promise<WebhookEventDetail> {
    const event = await this.repository.findById(id);
    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }
    return event;
  }
}
