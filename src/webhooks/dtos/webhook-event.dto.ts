import { IsIn, IsInt, IsNotEmpty, IsPositive, IsString, Length } from 'class-validator';

export class WebhookEventDto {
  @IsString()
  @IsNotEmpty({message: 'Event Id is required.'})
  eventId: string;

  @IsString()
  @IsNotEmpty({message: 'Payment Id is required.'})
  paymentId: string;

  @IsString()
  @IsNotEmpty({message: 'Provider Id is required.'})
  provider: string;

  @IsString()
  @IsIn([
    'PROCESSING',
    'DEAD_LETTER',
    'COMPLETED',
    'FAILED',
    'PENDING'
  ])
  status: string;

  @IsInt()
  @IsPositive({message: 'Amount must be positive'})
  amount: number;

  @IsString()
  @Length(3, 3)
  currency: string;
}
