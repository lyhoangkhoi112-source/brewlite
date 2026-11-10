import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserService } from './user.service.js';

describe('UserService', () => {
  let service: UserService;
  const prisma = {
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(UserService);
  });

  it('searches only staff and customers when no role filter is supplied', async () => {
    prisma.user.findMany.mockResolvedValue([]);

    await service.findAll({ search: '  hoa  ' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          role: { in: [UserRole.CUSTOMER, UserRole.STAFF] },
          OR: [
            { fullName: { contains: 'hoa', mode: 'insensitive' } },
            { email: { contains: 'hoa', mode: 'insensitive' } },
          ],
        },
      }),
    );
  });

  it('creates a normalized customer account without returning its password hash', async () => {
    prisma.user.create.mockResolvedValue({ id: 'user-id' });

    await service.create({
      fullName: '  Hoa Nguyen ',
      email: ' HOA@example.com ',
      password: 'password123',
    });

    const createArgs = prisma.user.create.mock.calls[0][0];
    expect(createArgs.data).toMatchObject({
      fullName: 'Hoa Nguyen',
      email: 'hoa@example.com',
      role: UserRole.CUSTOMER,
    });
    expect(createArgs.data.passwordHash).not.toBe('password123');
    expect(createArgs.select.passwordHash).toBeUndefined();
  });

  it('unlocks blocked accounts and resets all lockout fields', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'staff-id',
      status: UserStatus.BLOCKED,
      role: UserRole.STAFF,
    });
    prisma.user.update.mockResolvedValue({ id: 'staff-id' });

    await service.unlock('staff-id');

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'staff-id' },
        data: {
          status: UserStatus.ACTIVE,
          failedLoginAttempts: 0,
          loginLockoutStage: 0,
          lockedUntil: null,
        },
      }),
    );
  });

  it('rejects unlocking accounts that are not blocked', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'staff-id',
      status: UserStatus.ACTIVE,
      role: UserRole.STAFF,
    });

    await expect(service.unlock('staff-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('does not expose manager accounts through managed-user lookup', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.findOne('manager-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'manager-id',
          role: { in: [UserRole.CUSTOMER, UserRole.STAFF] },
        },
      }),
    );
  });

  it('translates duplicate emails into a conflict response', async () => {
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicate', {
        code: 'P2002',
        clientVersion: '5.22.0',
      }),
    );

    await expect(
      service.create({
        fullName: 'Hoa Nguyen',
        email: 'hoa@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow('Email này đã được sử dụng');
  });
});
