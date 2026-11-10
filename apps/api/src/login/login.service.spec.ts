import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginService } from './login.service.js';

describe('LoginService', () => {
  let service: LoginService;
  let user: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    passwordHash: string;
    role: UserRole;
    status: UserStatus;
    failedLoginAttempts: number;
    loginLockoutStage: number;
    lockedUntil: Date | null;
  };
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };
  let jwt: { signAsync: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    user = {
      id: 'user-id',
      fullName: 'Test User',
      email: 'user@example.com',
      phone: '0901234567',
      passwordHash: bcrypt.hashSync('correct-password', 4),
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      failedLoginAttempts: 0,
      loginLockoutStage: 0,
      lockedUntil: null,
    };

    prisma = {
      user: {
        findUnique: vi.fn().mockImplementation(async () => user),
        update: vi.fn().mockImplementation(async ({ data }) => {
          user = { ...user, ...data };
          return user;
        }),
      },
    };
    jwt = { signAsync: vi.fn().mockResolvedValue('signed-token') };

    const config = {
      get: (key: string) => {
        if (key === 'LOGIN_MAX_FAILED_ATTEMPTS') return '5';
        if (key === 'LOGIN_LOCKOUT_DURATIONS_MINUTES') return '1,5';
        return undefined;
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<LoginService>(LoginService);
  });

  it('locks for one minute after five consecutive failures', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-02T00:00:00.000Z'));

    try {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await expect(
          service.login({ email: user.email, password: 'wrong-password' }),
        ).rejects.toThrow();
      }

      expect(user.failedLoginAttempts).toBe(0);
      expect(user.loginLockoutStage).toBe(1);
      expect(user.lockedUntil?.getTime()).toBe(Date.now() + 60_000);

      const compareCallsBeforeLock = prisma.user.update.mock.calls.length;
      await expect(
        service.login({ email: user.email, password: 'correct-password' }),
      ).rejects.toThrow();
      expect(prisma.user.update).toHaveBeenCalledTimes(compareCallsBeforeLock);
    } finally {
      vi.useRealTimers();
    }
  });

  it('escalates the next lockout and permanently blocks after the following one', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        service.login({ email: user.email, password: 'wrong-password' }),
      ).rejects.toThrow();
    }
    expect(user.loginLockoutStage).toBe(1);

    user.lockedUntil = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        service.login({ email: user.email, password: 'wrong-password' }),
      ).rejects.toThrow();
    }
    expect(user.loginLockoutStage).toBe(2);
    expect(user.lockedUntil).toBeInstanceOf(Date);

    user.lockedUntil = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        service.login({ email: user.email, password: 'wrong-password' }),
      ).rejects.toThrow();
    }
    expect(user.status).toBe(UserStatus.BLOCKED);
  });

  it('resets the failure count and escalation after a successful login', async () => {
    user.failedLoginAttempts = 3;
    user.loginLockoutStage = 1;

    const result = await service.login({
      email: user.email,
      password: 'correct-password',
    });

    expect(result.accessToken).toBe('signed-token');
    expect(result.user.phone).toBe(user.phone);
    expect(user.failedLoginAttempts).toBe(0);
    expect(user.loginLockoutStage).toBe(0);
    expect(user.lockedUntil).toBeNull();
  });

  it('reports inactive accounts as nonexistent', async () => {
    user.status = UserStatus.INACTIVE;

    await expect(
      service.login({ email: user.email, password: 'correct-password' }),
    ).rejects.toThrow('Tài khoản không tồn tại');

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('changes a customer password after verifying the current password', async () => {
    await expect(
      service.changePassword('user-id', {
        currentPassword: 'correct-password',
        newPassword: 'new-password',
      }),
    ).resolves.toEqual({ message: 'Đổi mật khẩu thành công' });

    const updatedUser = prisma.user.update.mock.calls.at(-1)?.[0];
    expect(updatedUser.where).toEqual({ id: 'user-id' });
    expect(
      await bcrypt.compare('new-password', updatedUser.data.passwordHash),
    ).toBe(true);
  });

  it('rejects password changes when the current password is incorrect', async () => {
    await expect(
      service.changePassword('user-id', {
        currentPassword: 'wrong-password',
        newPassword: 'new-password',
      }),
    ).rejects.toThrow('Mật khẩu hiện tại không chính xác');

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('does not allow staff accounts to use the customer password-change flow', async () => {
    user.role = UserRole.STAFF;

    await expect(
      service.changePassword('user-id', {
        currentPassword: 'correct-password',
        newPassword: 'new-password',
      }),
    ).rejects.toThrow('Chức năng này chỉ dành cho khách hàng');

    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
