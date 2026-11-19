import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentProvider } from '../../common/enum/payment-provider.enum.js';

export class ValidateProvider implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const param = req.params['provider'];

    if (!param) {
      throw new BadRequestException('Missing or Invalid Provider');
    }

    if (!Object.values(PaymentProvider).includes(param as PaymentProvider)) {
      throw new BadRequestException('Missing or Invalid Provider');
    }

    return true;
  }
}
