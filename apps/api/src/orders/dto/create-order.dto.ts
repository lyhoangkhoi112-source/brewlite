import { IsInt, IsUUID, Min } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  idempotencyKey: string;

  @IsUUID()
  userId: string;

  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
