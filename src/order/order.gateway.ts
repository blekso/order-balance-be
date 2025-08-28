/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WebSocket } from 'ws';

type BinanceSockets = {
  depth?: WebSocket;
  ticker?: WebSocket;
};

@WebSocketGateway({ cors: { origin: '*' } })
export class OrderGateway {
  @WebSocketServer() server!: Server;

  private clientStreams = new Map<string, Map<string, BinanceSockets>>();

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() payload: { symbol: string },
    @ConnectedSocket() client: Socket,
  ) {
    const symbol = payload.symbol.toLowerCase();

    if (!this.clientStreams.has(client.id)) {
      this.clientStreams.set(client.id, new Map());
    }
    const perClient = this.clientStreams.get(client.id)!;
    if (perClient.has(symbol)) return;

    const sockets: BinanceSockets = {};
    perClient.set(symbol, sockets);

    sockets.depth = new WebSocket(
      `wss://stream.binance.com/stream?streams=${symbol}@depth20`,
    );
    sockets.depth.on('message', (buf: WebSocket.RawData) => {
      client.emit('depth_update', JSON.parse(buf.toString()));
    });
    sockets.depth.on('close', () => client.emit('depth_end', { symbol }));
    sockets.depth.on('error', () => client.emit('depth_error', { symbol }));

    sockets.ticker = new WebSocket(
      `wss://stream.binance.com/ws/${symbol}@ticker`,
    );
    sockets.ticker.on('message', (buf: WebSocket.RawData) => {
      client.emit('ticker_update', JSON.parse(buf.toString()));
    });
    sockets.ticker.on('close', () => client.emit('ticker_end', { symbol }));
    sockets.ticker.on('error', () => client.emit('ticker_error', { symbol }));
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() payload: { symbol: string },
    @ConnectedSocket() client: Socket,
  ) {
    const symbol = payload.symbol.toLowerCase();
    const perClient = this.clientStreams.get(client.id);
    const pair = perClient?.get(symbol);
    pair?.depth?.close();
    pair?.ticker?.close();
    perClient?.delete(symbol);
    if (perClient && perClient.size === 0) this.clientStreams.delete(client.id);
  }

  handleDisconnect(client: Socket) {
    const perClient = this.clientStreams.get(client.id);
    if (!perClient) return;
    for (const sockets of perClient.values()) {
      sockets.depth?.close();
      sockets.ticker?.close();
    }
    this.clientStreams.delete(client.id);
  }
}
