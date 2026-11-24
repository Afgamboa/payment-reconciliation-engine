import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  CreateWebhookResult,
  NewWebhookEvent,
  WebhookEventDetail,
  WebhookRepository,
} from '../interfaces/webhook.reposiroty.js';

@Injectable()
export class PrismaWebhookRepository implements WebhookRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: NewWebhookEvent): Promise<CreateWebhookResult> {
    try {
      const event = await this.prisma.webhooks_Events.create({ data });
      return { event, created: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const event = await this.prisma.webhooks_Events.findUniqueOrThrow({
          where: {
            provider_eventId: {
              provider: data.provider,
              eventId: data.eventId,
            },
          },
        });
        return { event, created: false };
      }
      throw error;
    }
  }

  async findById(id: string): Promise<WebhookEventDetail | null> {
    return this.prisma.webhooks_Events.findUnique({
      where: { id },
      include: { attemptsLog: { orderBy: { attemptNumber: 'asc' } } },
    });
  }
}
