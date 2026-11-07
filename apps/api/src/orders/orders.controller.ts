import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  CancelOrderDto,
  CreateOrderDto,
  GuestOrderAccessDto,
} from './dto/create-order.dto.js';
import { MockPaymentDto } from './dto/mock-payment.dto.js';
import { GuestOrJwtAuthGuard, JwtAuthGuard } from './jwt-auth.guard.js';
import { OrdersService } from './orders.service.js';

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(GuestOrJwtAuthGuard)
  createOrder(
    @Body() input: CreateOrderDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ordersService.createOrderForUser(input, request.user?.id);
  }

  @Post(':id/payments/:paymentId/mock')
  @UseGuards(GuestOrJwtAuthGuard)
  simulateMockPayment(
    @Param('id', new ParseUUIDPipe()) orderId: string,
    @Param('paymentId', new ParseUUIDPipe()) paymentId: string,
    @Body() input: MockPaymentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ordersService.simulateMockPayment(
      orderId,
      paymentId,
      input,
      request.user?.id,
    );
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  getMyOrders(@Req() request: AuthenticatedRequest) {
    return this.ordersService.getOrdersForUser(request.user!.id);
  }

  @Get('loyalty/mine')
  @UseGuards(JwtAuthGuard)
  getMyLoyalty(@Req() request: AuthenticatedRequest) {
    return this.ordersService.getLoyaltyForUser(request.user!.id);
  }

  @Post('guest/history')
  getGuestOrders(@Body() input: GuestOrderAccessDto) {
    return this.ordersService.getGuestOrders(input.accessTokens);
  }

  @Post(':id/cancel')
  @UseGuards(GuestOrJwtAuthGuard)
  cancelOrder(
    @Param('id', new ParseUUIDPipe()) orderId: string,
    @Body() input: CancelOrderDto = new CancelOrderDto(),
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ordersService.cancelOrder(
      orderId,
      request.user?.id,
      input.accessTokens ?? [],
    );
  }
}
