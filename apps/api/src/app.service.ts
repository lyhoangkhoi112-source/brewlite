import { Injectable, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}
  getHello(): string {
    return 'BrewLite API is running!';
  }

  /*async getProduct(): Promise<any[]> {
    return this.prisma.product.findMany();
  }

  async getProductById(@Param('id') id: string): Promise<any> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async getOrderById(@Param('id') id: string): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }*/
}
