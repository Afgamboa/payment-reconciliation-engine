import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import {
  PAYMENT_EVENT_PATTERN,
  PaymentEventMessage,
} from '../common/events.js';

const PUBLISH_TIMEOUT_MS = 2000;

@Injectable()
export class EventPublisher {
  private readonly logger = new Logger(EventPublisher.name);

  constructor(
    @Inject('PAYMENTS_SERVICE_QUEUE')
    private readonly client: ClientProxy,
  ) {}

  // The message only wakes the worker up; the event itself lives in PostgreSQL,
  // so a lost message is recovered by the worker's polling.
  async notify(message: PaymentEventMessage): Promise<void> {
    try {
      await lastValueFrom(
        this.client
          .emit(PAYMENT_EVENT_PATTERN, message)
          .pipe(timeout(PUBLISH_TIMEOUT_MS)),
      );
    } catch (error) {
      this.logger.warn({
        message: 'Could not notify worker, polling will pick the event up',
        eventId: message.id,
        provider: message.provider,
        error: String(error),
      });
    }
  }
}
