import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

@Controller()
export class EventConsumer {
  @EventPattern('payment_event')
  async handlePaymentEvent(@Payload() data: any) {
    console.log('Event received:', data);
  }
}
