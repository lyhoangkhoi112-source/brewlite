import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller.js';
import { MenuService } from './menu.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { HealthModule } from '../health/health.module.js';

@Module({
    imports: [PrismaModule, HealthModule],
    controllers: [MenuController],
    providers: [MenuService, PrismaService],
})

export class MenuModule {}