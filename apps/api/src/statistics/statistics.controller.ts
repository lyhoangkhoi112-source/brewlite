import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ProductsManagerGuard } from '../products/products-manager.guard.js';
import { MonthlyRevenueQueryDto } from './dto/monthly-revenue-query.dto.js';
import { StatisticsService } from './statistics.service.js';

@Controller('statistics')
@UseGuards(ProductsManagerGuard)
export class StatisticsController {
  constructor(private readonly statistics: StatisticsService) {}

  @Get('monthly-revenue')
  getMonthlyRevenue(@Query() query: MonthlyRevenueQueryDto) {
    return this.statistics.getMonthlyRevenue(query);
  }

  @Get('inventory')
  getInventory() {
    return this.statistics.getInventory();
  }
}