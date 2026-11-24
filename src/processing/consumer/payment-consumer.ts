import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  PAYMENT_EVENT_PATTERN,
  type PaymentEventMessage,
} from '../../common/events.js';
import { EventWorker } from '../event-worker.service.js';

@Controller()
export class PaymentConsumer {
  constructor(private readonly worker: EventWorker) {}

  @EventPattern(PAYMENT_EVENT_PATTERN)
  async handlePaymentEvent(
    @Payload() _message: PaymentEventMessage,
  ): Promise<void> {
    await this.worker.trigger();
  }
}
