import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { GuestOrJwtAuthGuard, JwtAuthGuard } from './jwt-auth.guard.js';
import { StaffOrdersGuard } from './staff-orders.guard.js';

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
  controllers: [OrdersController],
  providers: [
    OrdersService,
    GuestOrJwtAuthGuard,
    JwtAuthGuard,
    StaffOrdersGuard,
  ],
})
export class OrdersModule {}
