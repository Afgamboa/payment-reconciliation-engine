const numberFromEnv = (key: string, fallback: number): number => {
  const raw = process.env[key];
  const value = Number(raw);
  return raw !== undefined && raw !== '' && Number.isFinite(value)
    ? value
    : fallback;
};

export const appConfig = () => ({
  worker: {
    enabled: process.env.WORKER_ENABLED !== 'false',
    pollIntervalMs: numberFromEnv('WORKER_POLL_INTERVAL_MS', 2000),
    concurrency: numberFromEnv('WORKER_CONCURRENCY', 5),
    leaseMs: numberFromEnv('WORKER_LEASE_MS', 30000),
  },
  retry: {
    maxAttempts: numberFromEnv('RETRY_MAX_ATTEMPTS', 5),
    baseDelayMs: numberFromEnv('RETRY_BASE_DELAY_MS', 1000),
    maxDelayMs: numberFromEnv('RETRY_MAX_DELAY_MS', 60000),
  },
  reconciliation: {
    stuckAfterMs: numberFromEnv('RECONCILIATION_STUCK_AFTER_MS', 300000),
    batchSize: numberFromEnv('RECONCILIATION_BATCH_SIZE', 50),
  },
  mockProvider: {
    failureRate: numberFromEnv('MOCK_PROVIDER_FAILURE_RATE', 0),
  },
});

export type AppConfig = ReturnType<typeof appConfig>;
