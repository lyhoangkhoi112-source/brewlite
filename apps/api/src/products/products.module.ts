import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ProductsController } from './products.controller.js';
import { ProductsManagerGuard } from './products-manager.guard.js';
import { ProductsService } from './products.service.js';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET must be configured');
        }
        return { secret };
      },
    }),
  ],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsManagerGuard],
  exports: [ProductsManagerGuard, JwtModule],
})
export class ProductsModule {}