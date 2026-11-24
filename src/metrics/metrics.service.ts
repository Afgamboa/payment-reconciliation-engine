import { Injectable } from '@nestjs/common';
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();

  private readonly received = new Counter({
    name: 'webhook_events_received_total',
    help: 'Webhook events accepted and stored',
    registers: [this.registry],
  });

  private readonly duplicated = new Counter({
    name: 'webhook_events_duplicated_total',
    help: 'Webhook events ignored because their eventId was already stored',
    registers: [this.registry],
  });

  private readonly processed = new Counter({
    name: 'webhook_events_processed_total',
    help: 'Webhook events processed, by outcome',
    labelNames: ['outcome'],
    registers: [this.registry],
  });

  private readonly failed = new Counter({
    name: 'webhook_events_failed_total',
    help: 'Processing attempts that failed',
    registers: [this.registry],
  });

  private readonly retried = new Counter({
    name: 'webhook_events_retried_total',
    help: 'Events scheduled for another attempt',
    registers: [this.registry],
  });

  private readonly deadLettered = new Counter({
    name: 'webhook_events_dead_letter_total',
    help: 'Events moved to DEAD_LETTER',
    registers: [this.registry],
  });

  private readonly duration = new Histogram({
    name: 'webhook_event_processing_duration_seconds',
    help: 'Time spent processing one event attempt',
    buckets: [0.005, 0.025, 0.1, 0.5, 1, 5],
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry });
  }

  eventReceived() {
    this.received.inc();
  }

  eventDuplicated() {
    this.duplicated.inc();
  }

  eventProcessed(outcome: string) {
    this.processed.inc({ outcome });
  }

  eventFailed() {
    this.failed.inc();
  }

  eventRetried() {
    this.retried.inc();
  }

  eventDeadLettered() {
    this.deadLettered.inc();
  }

  startProcessingTimer(): () => void {
    return this.duration.startTimer();
  }

  render(): Promise<string> {
    return this.registry.metrics();
  }

  get contentType(): string {
    return this.registry.contentType;
  }
}
