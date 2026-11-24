import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createConnection } from 'node:net';
import { HealthIndicator } from './health-indicator.js';

const CONNECT_TIMEOUT_MS = 1500;
const DEFAULT_AMQP_PORT = 5672;

@Injectable()
export class RabbitMqHealthIndicator implements HealthIndicator {
  readonly name = 'rabbitmq';

  constructor(private readonly config: ConfigService) {}

  check(): Promise<void> {
    const { hostname, port } = new URL(
      this.config.getOrThrow<string>('RABBITMQ_URL'),
    );

    return new Promise((resolve, reject) => {
      const socket = createConnection({
        host: hostname,
        port: Number(port) || DEFAULT_AMQP_PORT,
        timeout: CONNECT_TIMEOUT_MS,
      });

      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('timeout', () => {
        socket.destroy();
        reject(new Error('RabbitMQ connection timed out'));
      });
      socket.once('error', (error) => {
        socket.destroy();
        reject(error);
      });
    });
  }
}
