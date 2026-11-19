import {
  CanActivate,
  ExecutionContext,
  RawBodyRequest,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'node:crypto';
import type { Request } from 'express';

export class ValidateSignature implements CanActivate {
  canActivate(context: ExecutionContext) {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RawBodyRequest<Request>>();
    const secret = process.env.WEBHOOK_SECRET;

    const signatureHeader = request.headers['x-webhook-signature'] as string;
    const rawBody = request.rawBody;
    if (!signatureHeader || !rawBody || !secret) {
      throw new UnauthorizedException('Missing signature, raw body, or secret');
    }

    const signature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const receivedHex = signatureHeader.replace(/^sha256=/, '');
    const expectedBuf = Buffer.from(signature, 'hex');
    const receivedBuf = Buffer.from(receivedHex, 'hex');

    if (
      expectedBuf.length !== receivedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      throw new UnauthorizedException('Invalid HMAC signature');
    }

    return true;
  }
}
