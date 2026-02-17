import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmPaymentDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  paymentId!: string;
}
