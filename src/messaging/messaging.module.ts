import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PAYMENTS_QUEUE } from '../common/events.js';
import { EventPublisher } from './rabbitmq.publisher.js';

@Module({})
export class MessagingModule {
  static register(): DynamicModule {
    return {
      module: MessagingModule,
      imports: [
        ClientsModule.registerAsync([
          {
            name: 'PAYMENTS_SERVICE_QUEUE',
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              transport: Transport.RMQ,
              options: {
                urls: [config.getOrThrow<string>('RABBITMQ_URL')],
                queue: PAYMENTS_QUEUE,
                queueOptions: { durable: true },
                persistent: true,
              },
            }),
          },
        ]),
      ],
      providers: [EventPublisher],
      exports: [EventPublisher],
    };
  }
}
