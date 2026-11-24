import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentProvider } from '../../common/enum/payment-provider.enum.js';

@Injectable()
export class ValidateProvider implements CanActivate {
  canActivate(context: ExecutionContext) {
    const provider = context.switchToHttp().getRequest<Request>().params[
      'provider'
    ];

    if (!Object.values<string>(PaymentProvider).includes(String(provider))) {
      throw new BadRequestException('Missing or Invalid Provider');
    }

    return true;
  }
}
