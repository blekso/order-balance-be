import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

export enum OrderType {
  BuyLimit,
  SellLimit,
  BuyMarket,
  SellMarket,
  Buy,
  Sell,
}

export enum OrderStatus {
  Pending,
  Filled,
  Canceled,
}

@Schema({ timestamps: { createdAt: 'created', updatedAt: false } })
export class Order {
  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  total: number;

  @Prop({ type: Number, enum: OrderType, required: true })
  type: OrderType;

  @Prop({ type: Number, enum: OrderStatus, default: OrderStatus.Pending })
  status: OrderStatus;

  @Prop()
  completed?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
