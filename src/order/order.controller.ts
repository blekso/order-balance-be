import { Controller, Get, Post, Body } from '@nestjs/common';

import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async create(@Body() dto: CreateOrderDto) {
    const verified = this.orderService.verifyAndExtract(dto);
    return this.orderService.create(verified);
  }

  @Get()
  findAll() {
    return this.orderService.findAll();
  }
}
