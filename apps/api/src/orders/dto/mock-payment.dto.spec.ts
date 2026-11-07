import 'reflect-metadata';
import { validate } from 'class-validator';
import { MockPaymentDto } from './mock-payment.dto.js';

describe('MockPaymentDto', () => {
  it.each(['SUCCESS', 'FAILED', 'CANCELLED'] as const)(
    'accepts the %s outcome',
    async (outcome) => {
      const input = Object.assign(new MockPaymentDto(), { outcome });

      await expect(validate(input)).resolves.toEqual([]);
    },
  );

  it('rejects unknown outcomes', async () => {
    const input = Object.assign(new MockPaymentDto(), { outcome: 'REFUNDED' });

    const errors = await validate(input);

    expect(errors.some(({ property }) => property === 'outcome')).toBe(true);
  });

  it('requires guest access tokens to be 64 characters', async () => {
    const input = Object.assign(new MockPaymentDto(), {
      outcome: 'SUCCESS',
      guestAccessToken: 'short',
    });

    const errors = await validate(input);

    expect(errors.some(({ property }) => property === 'guestAccessToken')).toBe(
      true,
    );
  });

  it('accepts supported mock payment providers', async () => {
    const input = Object.assign(new MockPaymentDto(), {
      outcome: 'SUCCESS',
      paymentMethod: 'SHOPEEPAY',
    });

    await expect(validate(input)).resolves.toEqual([]);
  });

  it('rejects unsupported payment providers', async () => {
    const input = Object.assign(new MockPaymentDto(), {
      outcome: 'SUCCESS',
      paymentMethod: 'CASH',
    });

    const errors = await validate(input);

    expect(errors.some(({ property }) => property === 'paymentMethod')).toBe(
      true,
    );
  });
});
