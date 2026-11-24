import { ExponentialBackoffRetryPolicy } from './retry-policy.js';

describe('ExponentialBackoffRetryPolicy', () => {
  const policy = new ExponentialBackoffRetryPolicy(5, 1000, 5000);

  it('doubles the delay on each attempt', () => {
    expect([1, 2, 3].map((attempt) => policy.nextDelayMs(attempt))).toEqual([
      1000, 2000, 4000,
    ]);
  });

  it('caps the delay at the maximum', () => {
    expect(policy.nextDelayMs(10)).toBe(5000);
  });
});
