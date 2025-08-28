import { OrderStatus, OrderType } from '../schema/order.schema';

export class CreateOrderDto {
  symbol: string;

  price: number;

  quantity: number;

  total: number;

  type: OrderType;

  status?: OrderStatus;
}
