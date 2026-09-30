import { Test, TestingModule } from '@nestjs/testing';
import { EntriesController } from './entries.controller';
import { EntriesService } from './entries.service';
import { AuthGuard } from '../auth/auth.guard';

describe('EntriesController', () => {
  let controller: EntriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EntriesController],
      providers: [{ provide: EntriesService, useValue: {} }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EntriesController>(EntriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
