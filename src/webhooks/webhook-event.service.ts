import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { WebhookEventDto } from './dtos/webhook-event.dto.js';
import type {
  CreateWebhookEvent,
  WebhookEvent,
  WebhookRepository,
} from './interfaces/webhook.reposiroty.js';
import { Prisma } from '../generated/prisma/index.js';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class WebhookService {
  constructor(
    @Inject('WEBHOOK_REPOSITORY')
    private readonly repository: WebhookRepository,
  ) {}

  async setEvent(dto: WebhookEventDto) {
    try {
      const { amount, currency, ...eventData } = dto;

      const webhookEventCreate: CreateWebhookEvent = {
        ...eventData,
        rawPayload: { ...dto },
        attempts: 0,
      };

      return await this.repository.create(webhookEventCreate);
    } catch (error) {
      this.errorHandler(error);
      throw error;
    }
  }

  errorHandler(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'This event already exists, please check it.',
      );
    }
  }

  async findEventByIdAndPayment(
    eventId: string,
    paymentId: string,
  ): Promise<WebhookEvent | null> {
    return this.repository.findByEventAndPayment(eventId, paymentId);
  }
}
