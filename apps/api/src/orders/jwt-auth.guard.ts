import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  protected get allowGuest(): boolean {
    return false;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (!authorization) {
      if (this.allowGuest) return true;
      throw new UnauthorizedException('Vui lòng đăng nhập');
    }

    const [scheme, token, ...extra] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token || extra.length > 0) {
      throw new UnauthorizedException('Token đăng nhập không hợp lệ');
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub?: string }>(token);
      if (typeof payload.sub !== 'string') {
        throw new UnauthorizedException('Token đăng nhập không hợp lệ');
      }
      request.user = { id: payload.sub };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Token đăng nhập không hợp lệ');
    }
  }
}

@Injectable()
export class GuestOrJwtAuthGuard extends JwtAuthGuard {
  constructor(jwt: JwtService) {
    super(jwt);
  }

  protected get allowGuest(): boolean {
    return true;
  }
}
