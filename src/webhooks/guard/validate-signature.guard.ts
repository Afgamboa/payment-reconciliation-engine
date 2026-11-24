import {
  CanActivate,
  ExecutionContext,
  Injectable,
  RawBodyRequest,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class ValidateSignature implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<RawBodyRequest<Request>>();
    const secret = this.config.getOrThrow<string>('WEBHOOK_SECRET');
    const signatureHeader = request.headers['x-webhook-signature'];
    const rawBody = request.rawBody;

    if (typeof signatureHeader !== 'string' || !rawBody) {
      throw new UnauthorizedException('Missing signature or raw body');
    }

    const expected = createHmac('sha256', secret).update(rawBody).digest();
    const received = Buffer.from(signatureHeader.replace(/^sha256=/, ''), 'hex');

    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new UnauthorizedException('Invalid HMAC signature');
    }

    return true;
  }
}
