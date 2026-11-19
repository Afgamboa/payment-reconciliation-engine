import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { WebhookService } from './webhook-event.service.js';
import { WebhookEventDto } from './dtos/webhook-event.dto.js';
import { ValidateSignature } from './guard/validate-signature.guard.js';
import { ValidateProvider } from './guard/validate-provider.guard.js';

@Controller('/webhooks')
export class WebhookEventController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post(':provider')
  // @UseGuards(ValidateSignature, ValidateProvider)
  async setEvent(@Body() dto: WebhookEventDto) {
    await this.webhookService.setEvent(dto);
  }
}
