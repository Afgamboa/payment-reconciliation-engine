import { Module } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { WEBHOOK_REPOSITORY } from './interfaces/webhook.reposiroty.js';
import { PrismaWebhookRepository } from './repository/webhook-prisma.repository.js';
import { WebhookEventController } from './webhook-event.controller.js';
import { WebhookService } from './webhook-event.service.js';

@Module({
  imports: [PrismaModule, MessagingModule.register()],
  controllers: [WebhookEventController],
  providers: [
    WebhookService,
    { provide: WEBHOOK_REPOSITORY, useClass: PrismaWebhookRepository },
  ],
})
export class WebhookEventModule {}
