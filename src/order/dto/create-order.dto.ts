import { OrderStatus, OrderType } from '../schema/order.schema';

export class CreateOrderDto {
  symbol: string;
  price: number;
  quantity: number;
  total: number;
  orderType: OrderType;
  status?: OrderStatus;

  maker: string;
  signature: string;

  nonce: number;
  expiry: number;
}
