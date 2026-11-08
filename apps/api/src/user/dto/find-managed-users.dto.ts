import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserRole, UserStatus } from '@prisma/client';

export class FindManagedUsersDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Type(() => String)
  @IsIn([UserRole.CUSTOMER, UserRole.STAFF])
  role?: Exclude<UserRole, 'MANAGER'>;

  @IsOptional()
  @Type(() => String)
  @IsIn([UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.BLOCKED])
  status?: UserStatus;
}
