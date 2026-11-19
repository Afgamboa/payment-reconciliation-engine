import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PaymentStatusEvent } from '../common/events.js';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class EventPublisher {
  private readonly logger = new Logger(EventPublisher.name);

  constructor(
    @Inject('PAYMENTS_SERVICE_QUEUE')
    private readonly client: ClientProxy,
  ) {}

  async publish(pattern: string, payload: PaymentStatusEvent): Promise<void> {
    const eventB = this.eventBuild(payload);
    try {
      await lastValueFrom(this.client.emit(pattern, eventB));
    } catch (error) {
      this.logger.error(
        `Could not publish ${pattern} (${eventB.eventId}): ${String(error)}`,
      );
    }
  }

  eventBuild(payload: PaymentStatusEvent): PaymentStatusEvent {
    return {
      ...payload,
      occurredAt: new Date().toISOString(),
    };
  }
}
