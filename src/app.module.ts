import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderModule } from './order/order.module';
import { SettleModule } from './settle/settle.module';

@Module({
  imports: [
    OrderModule,
    MongooseModule.forRoot(
      'mongodb://root:example@localhost:27017/nest?authSource=admin',
    ),
    SettleModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
