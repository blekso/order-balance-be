import { Module } from '@nestjs/common';
import { SettleService } from './settle.service';

@Module({
  providers: [SettleService],
})
export class SettleModule {}
