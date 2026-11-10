import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto.js';
import { FindProductsDto } from './dto/find-products.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductsManagerGuard } from './products-manager.guard.js';
import { ProductsService } from './products.service.js';

@Controller('products')
@UseGuards(ProductsManagerGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  findAll(@Query() filters: FindProductsDto) {
    return this.products.findAll(filters);
  }

  @Post()
  create(@Body() input: CreateProductDto) {
    return this.products.create(input);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateProductDto,
  ) {
    return this.products.update(id, input);
  }

  @Delete(':id')
  softDelete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.products.softDelete(id);
  }
}