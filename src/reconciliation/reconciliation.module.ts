import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payment.module.js';
import { ProvidersModule } from '../providers/providers.module.js';
import { ReconciliationController } from './reconciliation.controller.js';
import { ReconciliationService } from './reconciliation.service.js';

@Module({
  imports: [PaymentsModule, ProvidersModule],
  controllers: [ReconciliationController],
  providers: [ReconciliationService],
})
export class ReconciliationModule {}
