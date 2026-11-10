import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async getMenu(): Promise<any[]> {
    return this.prisma.product.findMany({
      where: { status: { not: ProductStatus.UNAVAILABLE } },
    });
  }

  async getMenuByName(name: string): Promise<any> {
    const menuItem = await this.prisma.product.findFirst({
      where: { name, status: { not: ProductStatus.UNAVAILABLE } },
    });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    return menuItem;
  }
}