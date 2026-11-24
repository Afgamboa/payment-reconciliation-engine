import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './common/config/app.config.js';
import { CorrelationIdMiddleware } from './common/logging/correlation-id.middleware.js';
import { HealthModule } from './health/health.module.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { PaymentsModule } from './payments/payment.module.js';
import { ProcessingModule } from './processing/processing.module.js';
import { ReconciliationModule } from './reconciliation/reconciliation.module.js';
import { WebhookEventModule } from './webhooks/webhook-event.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    MetricsModule,
    HealthModule,
    WebhookEventModule,
    PaymentsModule,
    ProcessingModule,
    ReconciliationModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
