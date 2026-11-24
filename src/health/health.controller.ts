import {
  Controller,
  Get,
  Inject,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HEALTH_INDICATORS, HealthIndicator } from './health-indicator.js';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @Inject(HEALTH_INDICATORS)
    private readonly indicators: HealthIndicator[],
  ) {}

  @Get()
  async check() {
    const results = await Promise.all(
      this.indicators.map(async (indicator) => {
        try {
          await indicator.check();
          return [indicator.name, 'up'] as const;
        } catch (error) {
          this.logger.error({
            message: 'Health check failed',
            dependency: indicator.name,
            error: String(error),
          });
          return [indicator.name, 'down'] as const;
        }
      }),
    );

    const body = {
      status: results.every(([, state]) => state === 'up') ? 'ok' : 'error',
      dependencies: Object.fromEntries(results),
    };

    if (body.status === 'error') {
      throw new ServiceUnavailableException(body);
    }

    return body;
  }
}
