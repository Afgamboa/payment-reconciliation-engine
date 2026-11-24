import { Controller, Get, Param } from '@nestjs/common';
import { PaymentService } from './payment.service.js';

@Controller('payments')
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Get(':id')
  getPayment(@Param('id') id: string) {
    return this.payments.getById(id);
  }
}
