import { Controller, Get, Param } from '@nestjs/common';
import { MenuService } from './menu.service.js';

@Controller('menu')
export class MenuController {
    constructor(private readonly menu: MenuService) {}

    @Get('all')
    async getMenu(): Promise<any[]> {
        return this.menu.getMenu();
    }

    @Get(':name')
    async getMenuByName(@Param('name') name: string): Promise<any> {
        return this.menu.getMenuByName(name);
    }
}