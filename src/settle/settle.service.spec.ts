import { Test, TestingModule } from '@nestjs/testing';
import { SettleService } from './settle.service';

describe('SettleService', () => {
  let service: SettleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SettleService],
    }).compile();

    service = module.get<SettleService>(SettleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
