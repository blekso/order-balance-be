/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// src/order/order-matching.service.ts
import { Injectable } from '@nestjs/common';
import { SettleService } from 'src/settle/settle.service';

export enum OrderType {
  BUY = 0,
  SELL = 1,
}
export enum OrderStatus {
  OPEN = 'OPEN',
  PARTIAL = 'PARTIAL',
  FILLED = 'FILLED',
}

export interface CreateOrderDto {
  symbol: string;
  price: number;
  quantity: number;
  total: number;
  type: OrderType;
  status?: OrderStatus;
}

type Order = {
  id: number;
  symbol: string;
  price: number;
  quantity: number;
  type: OrderType;
  status: OrderStatus;
  ts: number;
};

type Trade = {
  symbol: string;
  price: number;
  quantity: number;
  txHash: string;
};

let NEXT_ID = 1;

@Injectable()
export class OrderService {
  constructor(private readonly chain: SettleService) {}

  private bids: Order[] = [];
  private asks: Order[] = [];

  async create(dto: CreateOrderDto) {
    const taker: Order = {
      id: NEXT_ID++,
      symbol: dto.symbol.toLowerCase(),
      price: Number(dto.price),
      quantity: Number(dto.quantity),
      type: dto.type,
      status: OrderStatus.OPEN,
      ts: Date.now(),
    };

    const trades: Trade[] = [];

    if (taker.type === OrderType.BUY) {
      this.sortAsks();
      while (
        taker.quantity > 0 &&
        this.asks.length > 0 &&
        this.asks[0].price <= taker.price
      ) {
        const maker = this.asks[0];
        const q = Math.min(taker.quantity, maker.quantity);

        const txHash = await this.chain.settle(taker.symbol, maker.price, q);
        trades.push({
          symbol: taker.symbol,
          price: maker.price,
          quantity: q,
          txHash,
        });

        taker.quantity -= q;
        maker.quantity -= q;
        maker.status =
          maker.quantity === 0 ? OrderStatus.FILLED : OrderStatus.PARTIAL;

        if (maker.quantity === 0) this.asks.shift();
      }

      if (taker.quantity > 0) {
        taker.status =
          taker.quantity < dto.quantity
            ? OrderStatus.PARTIAL
            : OrderStatus.OPEN;
        this.bids.push(taker);
        this.sortBids();
      } else {
        taker.status = OrderStatus.FILLED;
      }
    } else {
      this.sortBids();
      while (
        taker.quantity > 0 &&
        this.bids.length > 0 &&
        this.bids[0].price >= taker.price
      ) {
        const maker = this.bids[0];
        const q = Math.min(taker.quantity, maker.quantity);

        const txHash = await this.chain.settle(taker.symbol, maker.price, q);
        trades.push({
          symbol: taker.symbol,
          price: maker.price,
          quantity: q,
          txHash,
        });

        taker.quantity -= q;
        maker.quantity -= q;
        maker.status =
          maker.quantity === 0 ? OrderStatus.FILLED : OrderStatus.PARTIAL;

        if (maker.quantity === 0) this.bids.shift();
      }

      if (taker.quantity > 0) {
        taker.status =
          taker.quantity < dto.quantity
            ? OrderStatus.PARTIAL
            : OrderStatus.OPEN;
        this.asks.push(taker);
        this.sortAsks();
      } else {
        taker.status = OrderStatus.FILLED;
      }
    }

    return { orderId: taker.id, trades };
  }

  findAll() {
    return {
      bids: this.bids.map(({ id, price, quantity }) => ({
        id,
        price,
        quantity,
      })),
      asks: this.asks.map(({ id, price, quantity }) => ({
        id,
        price,
        quantity,
      })),
    };
  }

  private sortBids() {
    this.bids.sort((a, b) =>
      b.price === a.price ? a.ts - b.ts : b.price - a.price,
    );
  }
  private sortAsks() {
    this.asks.sort((a, b) =>
      a.price === b.price ? a.ts - b.ts : a.price - b.price,
    );
  }
}
