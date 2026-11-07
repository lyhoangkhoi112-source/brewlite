import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async getMenu(): Promise<any[]> {
    const menuItems = await this.prisma.product.findMany();
    if (!menuItems || menuItems.length === 0) {
      throw new NotFoundException('No menu items found');
    }
    return menuItems;
  }

  async getMenuByName(name: string): Promise<any> {
    const menuItem = await this.prisma.product.findFirst({
      where: { name: name },
    });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    return menuItem;
  }
}