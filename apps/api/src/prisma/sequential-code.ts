import { Prisma } from '@prisma/client';

export type SequentialCodePrefix = 'KH' | 'NV' | 'QL' | 'HD';

export function getNextSequentialCode(
  prefix: SequentialCodePrefix,
  existingCodes: string[],
): string {
  const usedNumbers = new Set(
    existingCodes
      .map((code) => new RegExp(`^${prefix}(\\d{8})$`).exec(code)?.[1])
      .filter((value): value is string => value !== undefined)
      .map(Number),
  );

  for (let number = 1; number <= 99_999_999; number += 1) {
    if (!usedNumbers.has(number)) {
      return `${prefix}${number.toString().padStart(8, '0')}`;
    }
  }

  throw new Error(`Đã sử dụng hết mã ${prefix}`);
}

export async function getNextSequentialCodeInTransaction(
  transaction: Prisma.TransactionClient,
  prefix: SequentialCodePrefix,
): Promise<string> {
  await transaction.$queryRaw(
    Prisma.sql`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${prefix}))) AS lock`,
  );

  const existingCodes =
    prefix === 'HD'
      ? (
          await transaction.order.findMany({
            where: { orderCode: { startsWith: prefix } },
            select: { orderCode: true },
          })
        ).map(({ orderCode }) => orderCode)
      : (
          await transaction.user.findMany({
            where: { id: { startsWith: prefix } },
            select: { id: true },
          })
        ).map(({ id }) => id);

  return getNextSequentialCode(prefix, existingCodes);
}
