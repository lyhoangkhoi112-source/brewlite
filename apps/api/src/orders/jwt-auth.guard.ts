// File giúp định nghĩa hai guard: JwtAuthGuard và GuestOrJwtAuthGuard xác thực JWT cho API
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request { // Mở rộng Request để thêm thông tin user đã xác thực
  user?: { id: string };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  protected get allowGuest(): boolean { // Getter mặc định là false, nghĩa là không cho request thiếu token đi tiếp
    return false;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> { // Kiểm tra request đi qua guard và xác thực JWT nếu có
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>(); // Lấy request http từ context và ép kiểu sang AuthenticatedRequest để có thể thêm thông tin user đã xác thực
    const authorization = request.headers.authorization; // Lấy header Authorization từ request để kiểm tra token JWT
    if (!authorization) {
      if (this.allowGuest) return true;
      throw new UnauthorizedException('Vui lòng đăng nhập');
    }

    const [scheme, token, ...extra] = authorization.split(' '); // tách header ra thành scheme, token và các phần thừa (nếu có)
    if (scheme !== 'Bearer' || !token || extra.length > 0) { // Nếu scheme không phải Bearer hoặc token không có hoặc có phần bị dư thừa thì token không hợp lệ
      throw new UnauthorizedException('Token đăng nhập không hợp lệ');
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub?: string }>(token); // Yêu cầu xác minh token JWT và lấy payload
      if (typeof payload.sub !== 'string') { // Nếu payload không có sub hoặc sub không phải chuỗi thì token không hợp lệ
        throw new UnauthorizedException('Token đăng nhập không hợp lệ');
      }
      request.user = { id: payload.sub }; // Gán thông tin user đã xác thực vào request
      return true; // Cho phép request đi tiếp
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Token đăng nhập không hợp lệ');
    }
  }
}

@Injectable()
export class GuestOrJwtAuthGuard extends JwtAuthGuard { // Class mở rộng từ class cha JWTAuthGuard, cho phép request thiếu token đi tiếp
  constructor(jwt: JwtService) {
    super(jwt);
  }

  protected get allowGuest(): boolean { // Kế thừa và ghi đè getter allowGuest để cho phép request thiếu token đi tiếp
    return true;
  }
}
