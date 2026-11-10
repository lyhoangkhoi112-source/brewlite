import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ProductsModule } from '../products/products.module.js';
import { ProductsManagerGuard } from '../products/products-manager.guard.js';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';

@Module({
  imports: [PrismaModule, ProductsModule],
  controllers: [UserController],
  providers: [UserService, ProductsManagerGuard],
})
export class UserModule {}