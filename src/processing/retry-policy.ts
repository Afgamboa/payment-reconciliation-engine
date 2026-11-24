export const RETRY_POLICY = 'RETRY_POLICY';

// Strategy pattern: the processor only asks "may I retry and when?", so the
// backoff algorithm can be swapped without touching the processing flow.
export interface RetryPolicy {
  readonly maxAttempts: number;
  nextDelayMs(attempt: number): number;
}

export class ExponentialBackoffRetryPolicy implements RetryPolicy {
  constructor(
    readonly maxAttempts: number,
    private readonly baseDelayMs: number,
    private readonly maxDelayMs: number,
  ) {}

  nextDelayMs(attempt: number): number {
    return Math.min(this.baseDelayMs * 2 ** (attempt - 1), this.maxDelayMs);
  }
}
