import { LoggerService } from '@nestjs/common';

type Level = 'debug' | 'info' | 'warn' | 'error';

export class StructuredLogger implements LoggerService {
  log(message: unknown, ...params: unknown[]) {
    this.write('info', message, params);
  }

  error(message: unknown, ...params: unknown[]) {
    this.write('error', message, params);
  }

  warn(message: unknown, ...params: unknown[]) {
    this.write('warn', message, params);
  }

  debug(message: unknown, ...params: unknown[]) {
    this.write('debug', message, params);
  }

  verbose(message: unknown, ...params: unknown[]) {
    this.write('debug', message, params);
  }

  private write(level: Level, message: unknown, params: unknown[]) {
    const context = params.at(-1);
    const body =
      typeof message === 'object' && message !== null
        ? message
        : { message: String(message) };

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context: typeof context === 'string' ? context : undefined,
      ...body,
    };

    process.stdout.write(`${JSON.stringify(entry)}\n`);
  }
}
