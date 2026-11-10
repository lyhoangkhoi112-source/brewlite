import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

@Injectable()
export class StaffOrdersGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (!authorization) {
      throw new UnauthorizedException(
        'Vui lòng đăng nhập bằng tài khoản nhân viên',
      );
    }

    const [scheme, token, ...extra] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token || extra.length > 0) {
      throw new UnauthorizedException('Token đăng nhập không hợp lệ');
    }

    let subject: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: string }>(token);
      if (typeof payload.sub !== 'string') {
        throw new UnauthorizedException('Token đăng nhập không hợp lệ');
      }
      subject = payload.sub;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Token đăng nhập không hợp lệ');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: subject },
      select: { id: true, role: true, status: true },
    });
    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      user.role !== UserRole.STAFF
    ) {
      throw new ForbiddenException(
        'Chức năng này chỉ dành cho tài khoản nhân viên',
      );
    }

    request.user = { id: user.id };
    return true;
  }
}
