import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsPositive,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export enum WebhookEventType {
  PAYMENT_STATUS_CHANGED = 'PAYMENT_STATUS_CHANGED',
}

export class WebhookEventDto {
  @IsString()
  @IsNotEmpty({ message: 'Event Id is required.' })
  @MaxLength(100)
  eventId: string;

  @IsString()
  @IsNotEmpty({ message: 'Payment Id is required.' })
  @MaxLength(100)
  paymentId: string;

  @IsEnum(WebhookEventType)
  type: WebhookEventType;

  // Not restricted to known statuses: unknown ones (e.g. REFUNDED) must be stored for review.
  @IsString()
  @IsNotEmpty({ message: 'Status is required.' })
  @MaxLength(50)
  status: string;

  @IsInt()
  @IsPositive({ message: 'Amount must be positive' })
  amount: number;

  @IsString()
  @Length(3, 3)
  currency: string;

  @IsISO8601({ strict: true })
  occurredAt: string;
}
