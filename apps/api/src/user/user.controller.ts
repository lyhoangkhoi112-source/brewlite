import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsManagerGuard } from '../products/products-manager.guard.js';
import { CreateManagedUserDto } from './dto/create-managed-user.dto.js';
import { FindManagedUsersDto } from './dto/find-managed-users.dto.js';
import { UpdateManagedUserDto } from './dto/update-managed-user.dto.js';
import { UserService } from './user.service.js';

@Controller('users')
@UseGuards(ProductsManagerGuard)
export class UserController {
  constructor(private readonly users: UserService) {}

  @Get()
  findAll(@Query() filters: FindManagedUsersDto) {
    return this.users.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.users.findOne(id);
  }

  @Post()
  create(@Body() input: CreateManagedUserDto) {
    return this.users.create(input);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateManagedUserDto,
  ) {
    return this.users.update(id, input);
  }

  @Post(':id/unlock')
  unlock(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.users.unlock(id);
  }

  @Delete(':id')
  softDelete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.users.softDelete(id);
  }
}