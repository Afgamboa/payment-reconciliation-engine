import { Module } from '@nestjs/common';
import { WebhookEventController } from './webhook-event.controller.js';
import { WebhookService } from './webhook-event.service.js';
import { PrismaWebhookRepository } from './repository/webhook-prisma.repository.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MessagingModule } from '../messaging/messaging.module.js';

@Module({
  imports: [PrismaModule, MessagingModule.register()],
  controllers: [WebhookEventController],
  providers: [
    WebhookService,
    {
      provide: 'WEBHOOK_REPOSITORY',
      useClass: PrismaWebhookRepository,
    },
  ],
})
export class WebhookEventModule {}
