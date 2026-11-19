import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhookEventModule } from './webhooks/webhook-event.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    WebhookEventModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
