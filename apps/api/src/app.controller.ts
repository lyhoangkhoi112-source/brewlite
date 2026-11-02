import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { AppService } from './app.service.js';
import { responseData } from './response/globalClass.js';
import { httpStatusCode, httpStatusMessage } from './response/globalEnum.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /*@Get('products')
  async getProduct(): Promise<responseData<string[]>> {
    try {
      const products = await this.appService.getProduct();
      return new responseData(products, httpStatusCode.SUCCESS, httpStatusMessage.SUCCESS);
    } catch (error) {
      throw new responseData([], httpStatusCode.INTERNAL_SERVER_ERROR, httpStatusMessage.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('products/:id')
  async getProductById(@Param('id') id: string): Promise<responseData<string>> {
    try {
      const product = await this.appService.getProductById(id);
      return new responseData(product, httpStatusCode.SUCCESS, httpStatusMessage.SUCCESS);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new responseData([], httpStatusCode.NOT_FOUND, httpStatusMessage.NOT_FOUND);
      }
      throw new responseData([], httpStatusCode.INTERNAL_SERVER_ERROR, httpStatusMessage.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('orders/:id')
  async getOrderById(@Param('id') id: string): Promise<responseData<string>> {
    try {
      const order = await this.appService.getOrderById(id);
      return new responseData(order, httpStatusCode.SUCCESS, httpStatusMessage.SUCCESS);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new responseData([], httpStatusCode.NOT_FOUND, httpStatusMessage.NOT_FOUND);
      }
      throw new responseData([], httpStatusCode.INTERNAL_SERVER_ERROR, httpStatusMessage.INTERNAL_SERVER_ERROR);
    }
  }*/
}