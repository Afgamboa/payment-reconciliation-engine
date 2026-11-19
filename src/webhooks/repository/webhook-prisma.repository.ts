import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateWebhookEvent,
  WebhookEvent,
  WebhookRepository,
} from '../interfaces/webhook.reposiroty.js';

@Injectable()
export class PrismaWebhookRepository implements WebhookRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateWebhookEvent): Promise<WebhookEvent> {
    return this.prisma.webhooks_Events.create({ data });
  }

  async findByEventAndPayment(
    eventId: string,
    paymentId: string,
  ): Promise<WebhookEvent | null> {
    return this.prisma.webhooks_Events.findFirst({
      where: {
        eventId,
        paymentId,
      },
    });
  }
}
