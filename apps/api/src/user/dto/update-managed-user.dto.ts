import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole, UserStatus } from '@prisma/client';

export class UpdateManagedUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsIn([UserRole.CUSTOMER, UserRole.STAFF])
  role?: Exclude<UserRole, 'MANAGER'>;

  @IsOptional()
  @IsIn([UserStatus.ACTIVE, UserStatus.INACTIVE])
  status?: Exclude<UserStatus, 'BLOCKED'>;
}
