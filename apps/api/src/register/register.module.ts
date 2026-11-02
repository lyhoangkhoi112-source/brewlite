import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RegisterController } from './register.controller.js';
import { RegisterService } from './register.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [RegisterController],
  providers: [RegisterService],
})
export class RegisterModule {}