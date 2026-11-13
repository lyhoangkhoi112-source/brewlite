import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { getNextSequentialCodeInTransaction } from '../prisma/sequential-code.js';
import { RegisterDto } from './dto/register.dto.js';

const PASSWORD_HASH_ROUNDS = 10;

@Injectable()
export class RegisterService {
  constructor(private readonly prisma: PrismaService) {}

  async register(input: RegisterDto) {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);

    try {
      const user = await this.prisma.$transaction(async (transaction) => {
        const id = await getNextSequentialCodeInTransaction(
          transaction,
          'KH',
        );
        return transaction.user.create({
          data: {
            id,
            fullName: input.fullName.trim(),
            email,
            passwordHash,
            phone: input.phone?.trim() || null,
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            createdAt: true,
          },
        });
      });

      return user;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' //Kiểm tra email đã tồn tại trong database
      ) {
        throw new ConflictException('Email này đã được đăng ký');
      }

      throw error;
    }
  }
}
