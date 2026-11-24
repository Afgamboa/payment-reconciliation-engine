import { EventStatus } from '../common/enum/event-status.enum.js';
import { ProcessingOutcome } from '../common/enum/processing-outcome.enum.js';
import {
  PermanentError,
  TransientError,
} from '../common/errors/processing.errors.js';
import type {
  AttemptResult,
  EventQueueRepository,
  QueuedEvent,
} from './interfaces/event-queue.repository.js';
import { EventProcessor } from './event-processor.service.js';
import { ExponentialBackoffRetryPolicy } from './retry-policy.js';

const MAX_ATTEMPTS = 3;

const queuedEvent = (overrides: Partial<QueuedEvent> = {}): QueuedEvent => ({
  id: 'event-1',
  provider: 'WOMPI',
  eventId: 'evt-1',
  paymentId: 'pay-1',
  rawPayload: { status: 'COMPLETED', amount: 1000, currency: 'COP' },
  occurredAt: new Date('2026-11-18T14:00:00Z'),
  correlationId: 'corr-1',
  attempts: 1,
  ...overrides,
});

class FakeQueue implements EventQueueRepository {
  results: AttemptResult[] = [];

  constructor(private pending: QueuedEvent[]) {}

  async claimBatch(limit: number) {
    return this.pending.splice(0, limit);
  }

  async finishAttempt(_event: QueuedEvent, result: AttemptResult) {
    this.results.push(result);
  }
}

describe('EventProcessor', () => {
  const applyStatusChange = vi.fn();
  const metrics = {
    startProcessingTimer: () => () => undefined,
    eventProcessed: vi.fn(),
    eventFailed: vi.fn(),
    eventRetried: vi.fn(),
    eventDeadLettered: vi.fn(),
  };
  const config = {
    getOrThrow: (key: string) => (key === 'worker.concurrency' ? 2 : 30000),
  };

  const buildProcessor = (queue: FakeQueue) =>
    new EventProcessor(
      queue,
      new ExponentialBackoffRetryPolicy(MAX_ATTEMPTS, 1000, 60000),
      { applyStatusChange } as never,
      metrics as never,
      config as never,
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks the event PROCESSED when the change is applied', async () => {
    applyStatusChange.mockResolvedValue(ProcessingOutcome.APPLIED);
    const queue = new FakeQueue([queuedEvent()]);

    await buildProcessor(queue).processNextBatch();

    expect(queue.results).toEqual([
      { status: EventStatus.PROCESSED, outcome: ProcessingOutcome.APPLIED },
    ]);
  });

  it('keeps unknown statuses visible as NEEDS_REVIEW', async () => {
    applyStatusChange.mockResolvedValue(ProcessingOutcome.NEEDS_REVIEW);
    const queue = new FakeQueue([queuedEvent()]);

    await buildProcessor(queue).processNextBatch();

    expect(queue.results[0].status).toBe(EventStatus.NEEDS_REVIEW);
  });

  it('schedules a retry with backoff after a transient failure', async () => {
    applyStatusChange.mockRejectedValue(new TransientError('provider down'));
    const queue = new FakeQueue([queuedEvent({ attempts: 2 })]);
    const before = Date.now();

    await buildProcessor(queue).processNextBatch();

    const [result] = queue.results;
    expect(result.status).toBe(EventStatus.RETRY_PENDING);
    expect(result.error).toBe('provider down');
    expect(result.nextRetryAt!.getTime()).toBeGreaterThanOrEqual(before + 2000);
    expect(metrics.eventRetried).toHaveBeenCalledOnce();
  });

  it('moves the event to DEAD_LETTER when attempts are exhausted', async () => {
    applyStatusChange.mockRejectedValue(new TransientError('still down'));
    const queue = new FakeQueue([queuedEvent({ attempts: MAX_ATTEMPTS })]);

    await buildProcessor(queue).processNextBatch();

    expect(queue.results[0].status).toBe(EventStatus.DEAD_LETTER);
    expect(metrics.eventDeadLettered).toHaveBeenCalledOnce();
  });

  it('does not retry permanent business errors', async () => {
    applyStatusChange.mockRejectedValue(new PermanentError('invalid'));
    const queue = new FakeQueue([queuedEvent({ attempts: 1 })]);

    await buildProcessor(queue).processNextBatch();

    expect(queue.results[0].status).toBe(EventStatus.DEAD_LETTER);
  });

  it('sends malformed stored payloads to DEAD_LETTER without applying them', async () => {
    const queue = new FakeQueue([queuedEvent({ rawPayload: 'not-an-object' })]);

    await buildProcessor(queue).processNextBatch();

    expect(applyStatusChange).not.toHaveBeenCalled();
    expect(queue.results[0].status).toBe(EventStatus.DEAD_LETTER);
  });

  it('keeps processing the rest of the batch when one event fails', async () => {
    applyStatusChange
      .mockRejectedValueOnce(new TransientError('boom'))
      .mockResolvedValueOnce(ProcessingOutcome.APPLIED);
    const queue = new FakeQueue([
      queuedEvent({ id: 'a' }),
      queuedEvent({ id: 'b' }),
    ]);

    const claimed = await buildProcessor(queue).processNextBatch();

    expect(claimed).toBe(2);
    expect(queue.results.map((result) => result.status).sort()).toEqual([
      EventStatus.PROCESSED,
      EventStatus.RETRY_PENDING,
    ]);
  });
});
