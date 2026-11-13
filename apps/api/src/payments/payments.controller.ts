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
import { GuestOrJwtAuthGuard } from '../orders/jwt-auth.guard.js';
import { MockPaymentDto } from './dto/mock-payment.dto.js';
import { RetryMockPaymentDto } from './dto/retry-mock-payment.dto.js';
import { PaymentsService } from './payments.service.js';

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

@Controller('orders')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':id/payments/:paymentId/mock')
  @UseGuards(GuestOrJwtAuthGuard)
  simulateMockPayment(
    @Param('id', new ParseUUIDPipe()) orderId: string,
    @Param('paymentId', new ParseUUIDPipe()) paymentId: string,
    @Body() input: MockPaymentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.paymentsService.simulateMockPayment(
      orderId,
      paymentId,
      input,
      request.user?.id,
    );
  }

  @Get('mock-payments/:paymentId')
  getMockPayment(@Param('paymentId', new ParseUUIDPipe()) paymentId: string) {
    return this.paymentsService.getMockPaymentDetails(paymentId);
  }

  @Post('mock-payments/:paymentId')
  async simulateMockPaymentFromLink(
    @Param('paymentId', new ParseUUIDPipe()) paymentId: string,
    @Body() input: MockPaymentDto,
  ) {
    const order = await this.paymentsService.simulateMockPaymentFromLink(
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
    return this.paymentsService.retryMockPayment(
      orderId,
      input,
      request.user?.id,
    );
  }
}
