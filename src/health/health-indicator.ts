export const HEALTH_INDICATORS = 'HEALTH_INDICATORS';

export interface HealthIndicator {
  readonly name: string;
  check(): Promise<void>;
}
