import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  NewPayment,
  Payment,
  PaymentRepository,
  PaymentTransition,
} from '../interfaces/payment.repository.js';

@Injectable()
export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Payment | null> {
    return this.prisma.payments.findUnique({ where: { id } });
  }

  findByProviderPaymentId(
    provider: string,
    providerPaymentId: string,
  ): Promise<Payment | null> {
    return this.prisma.payments.findUnique({
      where: { provider_providerPaymentId: { provider, providerPaymentId } },
    });
  }

  async createIfAbsent(data: NewPayment): Promise<Payment | null> {
    try {
      return await this.prisma.payments.create({ data });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return null;
      }
      throw error;
    }
  }

  async transition(
    payment: Payment,
    change: PaymentTransition,
  ): Promise<boolean> {
    const { count } = await this.prisma.payments.updateMany({
      where: { id: payment.id, lastEventAt: payment.lastEventAt },
      data: change,
    });
    return count === 1;
  }

  findStuck(
    statuses: string[],
    updatedBefore: Date,
    limit: number,
  ): Promise<Payment[]> {
    return this.prisma.payments.findMany({
      where: { status: { in: statuses }, updatedAt: { lt: updatedBefore } },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });
  }
}
