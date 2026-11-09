import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../orders/jwt-auth.guard.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { LoginService } from './login.service.js';

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

@Controller('login')
export class LoginController {
  constructor(private readonly loginService: LoginService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  login(@Body() credentials: LoginDto) {
    return this.loginService.login(credentials);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Body() input: ChangePasswordDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.loginService.changePassword(request.user!.id, input);
  }
}