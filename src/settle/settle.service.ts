/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';

@Injectable()
export class SettleService {
  private readonly log = new Logger(SettleService.name);

  private provider?: ethers.JsonRpcProvider;
  private signer?: ethers.Wallet;
  private contract?: ethers.Contract;

  private readonly abi = [
    'function settleTrade(string symbol, uint256 price, uint256 qty) public returns (bool)',
  ];

  constructor() {
    const rpc = process.env.ETH_RPC_URL!;

    const pk = process.env.ENGINE_PRIVATE_KEY!;
    const address = process.env.CONTRACT_ADDRESS!;

    this.provider = new ethers.JsonRpcProvider(rpc);
    this.signer = new ethers.Wallet(pk, this.provider);
    this.contract = new ethers.Contract(address, this.abi, this.signer);
  }

  async settle(symbol: string, price: number, qty: number): Promise<string> {
    this.log.log(`Sending tx: settleTrade(${symbol}, ${price}, ${qty})`);

    const tx = await this.contract!.settleTrade(
      symbol,
      BigInt(Math.floor(price)),
      BigInt(Math.floor(qty)),
    );

    const receipt = await tx.wait();
    this.log.log(`Mined: ${receipt?.hash}`);
    return receipt?.hash ?? tx.hash;
  }
}
