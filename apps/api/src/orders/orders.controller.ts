import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { RetryMockPaymentDto } from './dto/retry-mock-payment.dto.js';
import {
  CancelStaffOrderDto,
  RejectStaffOrderDto,
  UpdateStaffOrderStatusDto,
} from './dto/staff-order.dto.js';
import { GuestOrJwtAuthGuard, JwtAuthGuard } from './jwt-auth.guard.js';
import { OrdersService } from './orders.service.js';
import { StaffOrdersGuard } from './staff-orders.guard.js';

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

  @Get('mock-payments/:paymentId')
  getMockPayment(@Param('paymentId', new ParseUUIDPipe()) paymentId: string) {
    return this.ordersService.getMockPaymentDetails(paymentId);
  }

  @Post('mock-payments/:paymentId')
  async simulateMockPaymentFromLink(
    @Param('paymentId', new ParseUUIDPipe()) paymentId: string,
    @Body() input: MockPaymentDto,
  ) {
    const order = await this.ordersService.simulateMockPaymentFromLink(
      paymentId,
      input,
    );
    return {
      orderCode: order.orderCode,
      status: order.status,
      payments: order.payments.map(({ id, amount, method, status }) => ({
        id,
        amount,
        method,
        status,
      })),
    };
  }

  @Post(':id/payments/retry')
  @UseGuards(GuestOrJwtAuthGuard)
  retryMockPayment(
    @Param('id', new ParseUUIDPipe()) orderId: string,
    @Body() input: RetryMockPaymentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ordersService.retryMockPayment(
      orderId,
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

  @Get('staff')
  @UseGuards(StaffOrdersGuard)
  getStaffOrders() {
    return this.ordersService.getStaffOrders();
  }

  @Get('staff/search')
  @UseGuards(StaffOrdersGuard)
  searchStaffOrder(@Query('orderCode') orderIdentifier?: string) {
    return this.ordersService.searchStaffOrder(orderIdentifier);
  }

  @Post(':id/staff-soft-delete')
  @UseGuards(StaffOrdersGuard)
  softDeleteStaffOrder(@Param('id', new ParseUUIDPipe()) orderId: string) {
    return this.ordersService.softDeleteStaffOrder(orderId);
  }

  @Patch(':id/staff-status')
  @UseGuards(StaffOrdersGuard)
  updateStaffOrderStatus(
    @Param('id', new ParseUUIDPipe()) orderId: string,
    @Body() input: UpdateStaffOrderStatusDto,
  ) {
    return this.ordersService.updateStaffOrderStatus(orderId, input.status);
  }

  @Post(':id/reject')
  @UseGuards(StaffOrdersGuard)
  rejectStaffOrder(
    @Param('id', new ParseUUIDPipe()) orderId: string,
    @Body() input: RejectStaffOrderDto,
  ) {
    return this.ordersService.rejectStaffOrder(orderId, input.reason);
  }

  @Post(':id/staff-cancel')
  @UseGuards(StaffOrdersGuard)
  cancelStaffOrder(
    @Param('id', new ParseUUIDPipe()) orderId: string,
    @Body() input: CancelStaffOrderDto,
  ) {
    return this.ordersService.cancelStaffOrder(orderId, input.reason);
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
