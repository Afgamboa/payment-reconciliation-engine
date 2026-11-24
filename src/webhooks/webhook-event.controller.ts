import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CORRELATION_ID_HEADER } from '../common/logging/correlation-id.middleware.js';
import { WebhookEventDto } from './dtos/webhook-event.dto.js';
import { ValidateProvider } from './guard/validate-provider.guard.js';
import { ValidateSignature } from './guard/validate-signature.guard.js';
import { WebhookService } from './webhook-event.service.js';

@Controller()
export class WebhookEventController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('webhooks/:provider')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(ValidateProvider, ValidateSignature)
  receive(
    @Param('provider') provider: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
    @Body() dto: WebhookEventDto,
  ) {
    return this.webhookService.receive(provider, dto, correlationId);
  }

  @Get('events/:id')
  getEvent(@Param('id') id: string) {
    return this.webhookService.getEvent(id);
  }
}
