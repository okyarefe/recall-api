import { Test, TestingModule } from '@nestjs/testing';
import { EntriesService } from './entries.service';
import { EntriesRepository } from './entries.repository';
import { EntryChunksRepository } from './entry-chunks.repository';
import { ExtractionService } from './extraction/extraction.service';
import { ChunkingService } from './chunking/chunking.service';
import { STORAGE_PROVIDER } from '../../infrastructure/storage/storage.interface';
import { EMBEDDINGS_PROVIDER } from '../../infrastructure/embeddings/embeddings.interface';

describe('EntriesService', () => {
  let service: EntriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntriesService,
        { provide: EntriesRepository, useValue: {} },
        { provide: EntryChunksRepository, useValue: {} },
        { provide: ExtractionService, useValue: {} },
        { provide: ChunkingService, useValue: {} },
        { provide: STORAGE_PROVIDER, useValue: {} },
        { provide: EMBEDDINGS_PROVIDER, useValue: {} },
      ],
    }).compile();

    service = module.get<EntriesService>(EntriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
