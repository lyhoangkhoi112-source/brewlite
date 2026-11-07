import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreateOrderItemDto } from './create-order.dto.js';

describe('CreateOrderItemDto', () => {
  it.each(['25%', '50%', '75%', '100%'])(
    'accepts %s sugar level',
    async (sugarLevel) => {
      const input = Object.assign(new CreateOrderItemDto(), {
        productId: '11234567-89ab-4cde-8f01-23456789abcd',
        quantity: 1,
        sugarLevel,
      });

      await expect(validate(input)).resolves.toEqual([]);
    },
  );

  it('rejects unsupported sugar levels', async () => {
    const input = Object.assign(new CreateOrderItemDto(), {
      productId: '11234567-89ab-4cde-8f01-23456789abcd',
      quantity: 1,
      sugarLevel: '0%',
    });

    const errors = await validate(input);

    expect(errors.some(({ property }) => property === 'sugarLevel')).toBe(true);
  });
});
