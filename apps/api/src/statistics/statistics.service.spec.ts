import { Test } from '@nestjs/testing';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { StatisticsService } from './statistics.service.js';

describe('StatisticsService', () => {
  let service: StatisticsService;
  const prisma = {
    $queryRaw: vi.fn(),
    product: {
      findMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        StatisticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(StatisticsService);
  });

  it('returns revenue for all months and fills missing months with zero', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { month: 1, revenue: new Prisma.Decimal('125000.50') },
      { month: 3, revenue: new Prisma.Decimal('50000.00') },
    ]);

    const result = await service.getMonthlyRevenue({ year: 2026 });

    expect(result.year).toBe(2026);
    expect(result.monthlyRevenue).toHaveLength(12);
    expect(result.monthlyRevenue[0]).toEqual({
      month: 1,
      revenue: '125000.50',
    });
    expect(result.monthlyRevenue[1]).toEqual({ month: 2, revenue: '0.00' });
    expect(result.monthlyRevenue[2]).toEqual({
      month: 3,
      revenue: '50000.00',
    });
  });

  it('marks active products below 10 units and lists low-stock products', async () => {
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'low-stock',
        name: 'Latte',
        category: null,
        stockQuantity: 9,
        status: ProductStatus.AVAILABLE,
      },
      {
        id: 'threshold',
        name: 'Tea',
        category: null,
        stockQuantity: 10,
        status: ProductStatus.AVAILABLE,
      },
    ]);

    const result = await service.getInventory();

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { not: ProductStatus.UNAVAILABLE } },
      }),
    );
    expect(result.lowStockThreshold).toBe(10);
    expect(result.products.map((product) => product.isLowStock)).toEqual([
      true,
      false,
    ]);
    expect(result.lowStockProducts.map((product) => product.id)).toEqual([
      'low-stock',
    ]);
  });
});
