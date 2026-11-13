import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  getNextSequentialCodeInTransaction,
  type SequentialCodePrefix,
} from '../prisma/sequential-code.js';
import { CreateManagedUserDto } from './dto/create-managed-user.dto.js';
import { FindManagedUsersDto } from './dto/find-managed-users.dto.js';
import { UpdateManagedUserDto } from './dto/update-managed-user.dto.js';

const PASSWORD_HASH_ROUNDS = 10;

const userRolePrefixes: Record<UserRole, SequentialCodePrefix> = {
  [UserRole.CUSTOMER]: 'KH',
  [UserRole.STAFF]: 'NV',
  [UserRole.MANAGER]: 'QL',
};

const managedUserSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  failedLoginAttempts: true,
  loginLockoutStage: true,
  lockedUntil: true,
  loyaltyPoints: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: FindManagedUsersDto) {
    return this.prisma.user.findMany({
      where: {
        role: filters.role ?? { in: [UserRole.CUSTOMER, UserRole.STAFF] },
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.search?.trim()
          ? {
              OR: [
                {
                  fullName: {
                    contains: filters.search.trim(),
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: filters.search.trim(),
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
      select: managedUserSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: { in: [UserRole.CUSTOMER, UserRole.STAFF] } },
      select: managedUserSelect,
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }
    return user;
  }

  async create(input: CreateManagedUserDto) {
    const passwordHash = await bcrypt.hash(
      input.password,
      PASSWORD_HASH_ROUNDS,
    );
    try {
      const role = input.role ?? UserRole.CUSTOMER;
      const prefix = userRolePrefixes[role];
      return await this.prisma.$transaction(async (transaction) => {
        const id = await getNextSequentialCodeInTransaction(
          transaction,
          prefix,
        );
        return transaction.user.create({
          data: {
            id,
            fullName: input.fullName.trim(),
            email: input.email.trim().toLowerCase(),
            passwordHash,
            phone: input.phone?.trim() || null,
            role,
          },
          select: managedUserSelect,
        });
      });
    } catch (error) {
      this.throwIfEmailConflict(error);
      throw error;
    }
  }

  async update(id: string, input: UpdateManagedUserDto) {
    const user = await this.findOne(id);
    const newRole = input.role;
    const data: Prisma.UserUpdateInput = {
      ...(input.fullName !== undefined
        ? { fullName: input.fullName.trim() }
        : {}),
      ...(input.email !== undefined
        ? { email: input.email.trim().toLowerCase() }
        : {}),
      ...(input.phone !== undefined
        ? { phone: input.phone?.trim() || null }
        : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.password !== undefined
        ? {
            passwordHash: await bcrypt.hash(
              input.password,
              PASSWORD_HASH_ROUNDS,
            ),
          }
        : {}),
    };

    try {
      if (newRole !== undefined && newRole !== user.role) {
        return await this.prisma.$transaction(async (transaction) => {
          const newId = await getNextSequentialCodeInTransaction(
            transaction,
            userRolePrefixes[newRole],
          );
          return transaction.user.update({
            where: { id },
            data: { ...data, id: newId },
            select: managedUserSelect,
          });
        });
      }

      return await this.prisma.user.update({
        where: { id },
        data,
        select: managedUserSelect,
      });
    } catch (error) {
      this.throwIfEmailConflict(error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Không tìm thấy tài khoản');
      }
      throw error;
    }
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.INACTIVE },
      select: managedUserSelect,
    });
  }

  async unlock(id: string) {
    const user = await this.findOne(id);
    if (user.status !== UserStatus.BLOCKED) {
      throw new ConflictException('Tài khoản không ở trạng thái bị khóa');
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.ACTIVE,
        failedLoginAttempts: 0,
        loginLockoutStage: 0,
        lockedUntil: null,
      },
      select: managedUserSelect,
    });
  }

  private throwIfEmailConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Email này đã được sử dụng');
    }
  }
}