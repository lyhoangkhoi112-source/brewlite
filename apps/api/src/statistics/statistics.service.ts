import { Injectable } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { MonthlyRevenueQueryDto } from './dto/monthly-revenue-query.dto.js';

const LOW_STOCK_THRESHOLD = 10;

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthlyRevenue(query: MonthlyRevenueQueryDto) {
    const year = query.year ?? new Date().getFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const startOfNextYear = new Date(Date.UTC(year + 1, 0, 1));
    const payments = await this.prisma.$queryRaw<
      Array<{ month: number; revenue: Prisma.Decimal }>
    >(Prisma.sql`
      SELECT EXTRACT(MONTH FROM "paidAt")::int AS month,
             SUM("amount") AS revenue
      FROM "Payment"
      WHERE "status" = 'SUCCESS'
        AND "paidAt" >= ${startOfYear}
        AND "paidAt" < ${startOfNextYear}
      GROUP BY EXTRACT(MONTH FROM "paidAt")
      ORDER BY month
    `);
    const revenueByMonth = new Map(
      payments.map(({ month, revenue }) => [month, revenue]),
    );

    return {
      year,
      monthlyRevenue: Array.from({ length: 12 }, (_, index) => ({
        month: index + 1,
        revenue: (
          revenueByMonth.get(index + 1) ?? new Prisma.Decimal(0)
        ).toFixed(2),
      })),
    };
  }

  async getInventory() {
    const products = await this.prisma.product.findMany({
      where: { status: { not: ProductStatus.UNAVAILABLE } },
      select: {
        id: true,
        name: true,
        category: true,
        stockQuantity: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      products: products.map((product) => ({
        ...product,
        isLowStock: product.stockQuantity < LOW_STOCK_THRESHOLD,
      })),
      lowStockProducts: products.filter(
        (product) => product.stockQuantity < LOW_STOCK_THRESHOLD,
      ),
    };
  }
}