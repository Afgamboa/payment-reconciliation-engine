import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

const digest = (value: string) => createHash('sha256').update(value).digest();

@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const expected = this.config.getOrThrow<string>('ADMIN_API_KEY');
    const received = context
      .switchToHttp()
      .getRequest<Request>()
      .headers['x-admin-key'];

    if (
      typeof received !== 'string' ||
      !timingSafeEqual(digest(received), digest(expected))
    ) {
      throw new UnauthorizedException('Invalid admin key');
    }

    return true;
  }
}
