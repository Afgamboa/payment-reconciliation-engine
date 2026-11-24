import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventProcessor } from './event-processor.service.js';

@Injectable()
export class EventWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(EventWorker.name);
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;

  constructor(
    private readonly processor: EventProcessor,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap() {
    if (!this.config.getOrThrow<boolean>('worker.enabled')) {
      return;
    }

    this.timer = setInterval(
      () => void this.trigger(),
      this.config.getOrThrow<number>('worker.pollIntervalMs'),
    );
  }

  async onApplicationShutdown() {
    clearInterval(this.timer);
    await this.running;
  }

  /** Starts draining the queue unless a drain is already in progress. */
  trigger(): Promise<void> {
    this.running ??= this.drain().finally(() => {
      this.running = undefined;
    });
    return this.running;
  }

  private async drain() {
    try {
      while ((await this.processor.processNextBatch()) > 0) {
        // keep claiming until nothing is due
      }
    } catch (error) {
      this.logger.error({ message: 'worker.drain_failed', error: String(error) });
    }
  }
}
