import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ProductsModule } from '../products/products.module.js';
import { ProductsManagerGuard } from '../products/products-manager.guard.js';
import { StatisticsController } from './statistics.controller.js';
import { StatisticsService } from './statistics.service.js';

@Module({
  imports: [PrismaModule, ProductsModule],
  controllers: [StatisticsController],
  providers: [StatisticsService, ProductsManagerGuard],
})
export class StatisticsModule {}