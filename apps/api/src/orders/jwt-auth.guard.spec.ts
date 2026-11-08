import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GuestOrJwtAuthGuard, JwtAuthGuard } from './jwt-auth.guard.js';

function makeContext(headers: Record<string, string>) {
  const request: { headers: Record<string, string>; user?: { id: string } } = {
    headers,
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
  return { context, request };
}

describe('order JWT guards', () => {
  it('requires a bearer token for account order history', async () => {
    const verifyAsync = vi.fn();
    const jwt = { verifyAsync } as unknown as JwtService;
    const guard = new JwtAuthGuard(jwt);
    const { context } = makeContext({});

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verifyAsync).not.toHaveBeenCalled();
  });

  it('allows an anonymous request on guest order routes', async () => {
    const verifyAsync = vi.fn();
    const jwt = { verifyAsync } as unknown as JwtService;
    const guard = new GuestOrJwtAuthGuard(jwt);
    const { context } = makeContext({});

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyAsync).not.toHaveBeenCalled();
  });

  it('uses the verified token subject as the request identity', async () => {
    const jwt = {
      verifyAsync: vi.fn().mockResolvedValue({ sub: 'verified-user-id' }),
    } as unknown as JwtService;
    const guard = new GuestOrJwtAuthGuard(jwt);
    const { context, request } = makeContext({
      authorization: 'Bearer signed-token',
    });
    request.user = { id: 'untrusted-user-id' };

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'verified-user-id' });
  });

  it('rejects malformed or invalid bearer tokens', async () => {
    const jwt = {
      verifyAsync: vi.fn().mockRejectedValue(new Error('invalid token')),
    } as unknown as JwtService;
    const guard = new GuestOrJwtAuthGuard(jwt);
    const { context } = makeContext({
      authorization: 'Bearer invalid-token',
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
