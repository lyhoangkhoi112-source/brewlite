import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterService } from './register.service.js';

describe('RegisterService', () => {
  let service: RegisterService;
  let prisma: {
    user: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    $queryRaw: ReturnType<typeof vi.fn>;
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: vi.fn().mockResolvedValue({
          id: 'KH00000001',
          fullName: 'Test User',
          email: 'user@example.com',
          phone: null,
          role: 'CUSTOMER',
          status: 'ACTIVE',
          createdAt: new Date(),
        }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      $queryRaw: vi.fn().mockResolvedValue([]),
      $transaction: vi.fn(
        (callback: (transaction: typeof prisma) => Promise<unknown>) =>
          callback(prisma),
      ),
    };
    const module = await Test.createTestingModule({
      providers: [
        RegisterService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(RegisterService);
  });

  it('hashes the password, normalizes email, and returns only safe user fields', async () => {
    const result = await service.register({
      fullName: ' Test User ',
      email: ' USER@EXAMPLE.COM ',
      password: 'secure-password',
    });

    const createArgument = prisma.user.create.mock.calls[0][0];
    expect(createArgument.data.id).toBe('KH00000001');
    expect(createArgument.data.fullName).toBe('Test User');
    expect(createArgument.data.email).toBe('user@example.com');
    expect(createArgument.data.passwordHash).not.toBe('secure-password');
    await expect(
      bcrypt.compare('secure-password', createArgument.data.passwordHash),
    ).resolves.toBe(true);
    expect(createArgument.select.passwordHash).toBeUndefined();
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('returns a conflict when the email is already registered', async () => {
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.22.0',
      }),
    );

    await expect(
      service.register({
        fullName: 'Test User',
        email: 'user@example.com',
        password: 'secure-password',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
