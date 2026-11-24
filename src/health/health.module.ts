import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DatabaseHealthIndicator } from './database.health.js';
import { HEALTH_INDICATORS, HealthIndicator } from './health-indicator.js';
import { HealthController } from './health.controller.js';
import { RabbitMqHealthIndicator } from './rabbitmq.health.js';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
  providers: [
    DatabaseHealthIndicator,
    RabbitMqHealthIndicator,
    {
      provide: HEALTH_INDICATORS,
      useFactory: (...indicators: HealthIndicator[]) => indicators,
      inject: [DatabaseHealthIndicator, RabbitMqHealthIndicator],
    },
  ],
})
export class HealthModule {}
