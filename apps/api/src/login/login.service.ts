import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;

function positiveInteger(value: string | undefined, name: string, fallback: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

@Injectable()
export class LoginService {
  private readonly maxFailedAttempts: number; //Điều chỉnh số lần đăng nhập sai trong file .env của backend
  private readonly lockoutDurationsMs: number[]; //Điều chỉnh thời gian khóa tài khoản trong file .env của backend (tính bằng phút)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.maxFailedAttempts = positiveInteger(
      config.get<string>('LOGIN_MAX_FAILED_ATTEMPTS'),
      'LOGIN_MAX_FAILED_ATTEMPTS',
      5,
    );

    const rawDurations = config.get<string>('LOGIN_LOCKOUT_DURATIONS_MINUTES') ?? '1,5';
    const durations = rawDurations.split(',').map((duration) => Number(duration.trim()));
    if (
      durations.length === 0 ||
      durations.some((duration) => !Number.isSafeInteger(duration) || duration < 1)
    ) {
      throw new Error('LOGIN_LOCKOUT_DURATIONS_MINUTES must be a comma-separated list of positive integers');
    }
    this.lockoutDurationsMs = durations.map((duration) => duration * 60 * 1000);
  }

  async login(credentials: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: credentials.email },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Tài khoản đã bị khóa do đăng nhập sai quá số lần cho phép');
    }

    const passwordMatches = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!passwordMatches) {
      await this.recordFailedAttempt(
        user.id,
        user.failedLoginAttempts,
        user.loginLockoutStage,
      );
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        loginLockoutStage: 0,
        lockedUntil: null,
      },
    });

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  private async recordFailedAttempt(
    userId: string,
    failedLoginAttempts: number,
    loginLockoutStage: number,
  ): Promise<void> {
    const attempts = failedLoginAttempts + 1;
    if (attempts < this.maxFailedAttempts) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: attempts },
      });
      return;
    }

    const nextStage = loginLockoutStage + 1;
    const lockoutDuration = this.lockoutDurationsMs[loginLockoutStage];
    if (lockoutDuration === undefined) { //Nếu không còn stage nào nữa thì lock tài khoản
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          status: UserStatus.BLOCKED,
        },
      });
      return;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        loginLockoutStage: nextStage,
        lockedUntil: new Date(Date.now() + lockoutDuration),
      },
    });
  }
}