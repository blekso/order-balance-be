/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SettleService } from 'src/settle/settle.service';
import {
  Order,
  OrderDocument,
  OrderStatus,
  OrderType,
} from './schema/order.schema';
import { Trade, TradeDocument } from './schema/trade.schema';
import { ethers } from 'ethers';
import { orderTypes } from 'src/utils';

type MatchedTrade = {
  symbol: string;
  price: number;
  quantity: number;
  txHash: string;
};

const isBuy = (t: OrderType) =>
  t === OrderType.BuyLimit || t === OrderType.BuyMarket || t === OrderType.Buy;

const isSell = (t: OrderType) =>
  t === OrderType.SellLimit ||
  t === OrderType.SellMarket ||
  t === OrderType.Sell;

const isLimit = (t: OrderType) =>
  t === OrderType.BuyLimit || t === OrderType.SellLimit;

@Injectable()
export class OrderService {
  constructor(
    private readonly chain: SettleService,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Trade.name) private readonly tradeModel: Model<TradeDocument>,
  ) {}

  async create(dto: any) {
    const type: OrderType = (dto.type ?? dto.orderType) as OrderType;
    if (typeof type !== 'number') {
      throw new Error('Order type is missing');
    }

    const SCALE = 1e8;
    const price = Number(dto.price) / SCALE;
    const quantity = Number(dto.quantity) / SCALE;
    const total = Number.isFinite(Number(dto.total))
      ? Number(dto.total) / SCALE
      : price * quantity;

    const taker = await this.orderModel.create({
      symbol: String(dto.symbol).toLowerCase(),
      price,
      quantity,
      total,
      type,
      status: dto.status ?? OrderStatus.Pending,
    });

    const trades: MatchedTrade[] = [];

    if (isBuy(taker.type)) {
      const sellTypes = [
        OrderType.SellLimit,
        OrderType.SellMarket,
        OrderType.Sell,
      ];
      const makers = await this.orderModel
        .find({
          symbol: taker.symbol,
          type: { $in: sellTypes },
          status: { $in: [OrderStatus.Pending, OrderStatus.Partial] },
          ...(isLimit(taker.type) ? { price: { $lte: taker.price } } : {}),
        })
        .sort({ price: 1, created: 1 })
        .exec();

      for (const maker of makers) {
        if (taker.quantity <= 0) break;

        const q = Math.min(taker.quantity, maker.quantity);
        const txHash = await this.chain.settle(taker.symbol, maker.price, q);

        await this.tradeModel.create({
          buyOrderId: taker._id,
          sellOrderId: maker._id,
          symbol: taker.symbol,
          price: maker.price,
          quantity: q,
          txHash,
        });

        trades.push({
          symbol: taker.symbol,
          price: maker.price,
          quantity: q,
          txHash,
        });

        taker.quantity -= q;
        maker.quantity -= q;

        await this.orderModel.findByIdAndUpdate(maker._id, {
          quantity: maker.quantity,
          total: maker.price * maker.quantity,
          status:
            maker.quantity === 0 ? OrderStatus.Filled : OrderStatus.Partial,
          completed: maker.quantity === 0 ? new Date() : undefined,
        });
      }
    }

    if (isSell(taker.type)) {
      const buyTypes = [OrderType.BuyLimit, OrderType.BuyMarket, OrderType.Buy];
      const makers = await this.orderModel
        .find({
          symbol: taker.symbol,
          type: { $in: buyTypes },
          status: { $in: [OrderStatus.Pending, OrderStatus.Partial] },
          ...(isLimit(taker.type) ? { price: { $gte: taker.price } } : {}),
        })
        .sort({ price: -1, created: 1 })
        .exec();

      for (const maker of makers) {
        if (taker.quantity <= 0) break;

        const q = Math.min(taker.quantity, maker.quantity);
        const txHash = await this.chain.settle(taker.symbol, maker.price, q);

        await this.tradeModel.create({
          buyOrderId: maker._id,
          sellOrderId: taker._id,
          symbol: taker.symbol,
          price: maker.price,
          quantity: q,
          txHash,
        });

        trades.push({
          symbol: taker.symbol,
          price: maker.price,
          quantity: q,
          txHash,
        });

        taker.quantity -= q;
        maker.quantity -= q;

        await this.orderModel.findByIdAndUpdate(maker._id, {
          quantity: maker.quantity,
          total: maker.price * maker.quantity,
          status:
            maker.quantity === 0 ? OrderStatus.Filled : OrderStatus.Partial,
          completed: maker.quantity === 0 ? new Date() : undefined,
        });
      }
    }

    await this.orderModel.findByIdAndUpdate(taker._id, {
      quantity: taker.quantity,
      total: taker.price * taker.quantity,
      status:
        taker.quantity === 0
          ? OrderStatus.Filled
          : taker.quantity < quantity
            ? OrderStatus.Partial
            : OrderStatus.Pending,
      completed: taker.quantity === 0 ? new Date() : undefined,
    });

    return { orderId: taker._id, trades };
  }

  async findAll() {
    const orders = await this.orderModel
      .find()
      .sort({ created: -1 })
      .lean()
      .exec();

    return orders.map((o) => ({
      _id: o._id.toString(),
      order: {
        symbol: o.symbol,
        price: o.price,
        quantity: o.quantity,
        total: o.total,
        type: o.type,
      },
      created: o.created,
      completed: o.completed,
      status: o.status,
    }));
  }

  verifyAndExtract(dto: any) {
    const { signature, ...order } = dto;

    const domain = {
      name: 'OrderBalance',
      version: '1',
      chainId: Number(process.env.CHAIN_ID),
      verifyingContract: process.env.CONTRACT_ADDRESS as string,
    };

    const recovered = ethers.verifyTypedData(
      domain,
      orderTypes,
      order,
      signature,
    );

    if (recovered.toLowerCase() !== dto.maker.toLowerCase()) {
      throw new Error('Invalid signature');
    }

    return dto;
  }
}
