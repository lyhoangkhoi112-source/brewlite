import { Body, Controller, Post } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto.js';
import { RegisterService } from './register.service.js';

@Controller('register')
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @Post()
  register(@Body() input: RegisterDto) {
    return this.registerService.register(input);
  }
}