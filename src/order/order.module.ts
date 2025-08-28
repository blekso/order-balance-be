import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from 'src/order/schema/order.schema';
import { OrderGateway } from './order.gateway';
import { Trade, TradeSchema } from './schema/trade.schema';
import { SettleModule } from 'src/settle/settle.module';
import { SettleService } from 'src/settle/settle.service';

@Module({
  imports: [
    SettleModule,
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Trade.name, schema: TradeSchema },
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderGateway, SettleService],
})
export class OrderModule {}
