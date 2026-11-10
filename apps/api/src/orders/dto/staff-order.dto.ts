import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateStaffOrderStatusDto {
  @IsIn(['CONFIRMED', 'PREPARING', 'READY'])
  status: 'CONFIRMED' | 'PREPARING' | 'READY';
}

export class RejectStaffOrderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason: string;
}

export class CancelStaffOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
