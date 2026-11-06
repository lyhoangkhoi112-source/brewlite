import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class MockPaymentDto {
  @IsIn(['SUCCESS', 'FAILED', 'CANCELLED'])
  outcome: 'SUCCESS' | 'FAILED' | 'CANCELLED';

  @IsOptional()
  @IsIn(['MOMO', 'VNPAY', 'SHOPEEPAY'])
  paymentMethod?: 'MOMO' | 'VNPAY' | 'SHOPEEPAY';

  @IsOptional()
  @IsString()
  @Length(64, 64)
  guestAccessToken?: string;
}
