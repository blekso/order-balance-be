import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TradeDocument = Trade & Document;

@Schema({ timestamps: { createdAt: 'created', updatedAt: false } })
export class Trade {
  @Prop({ type: Types.ObjectId, required: true })
  buyOrderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  sellOrderId: Types.ObjectId;

  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  txHash: string;
}

export const TradeSchema = SchemaFactory.createForClass(Trade);
