import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntryChunk } from './entities/entry-chunk.entity';

export type CreateChunkInput = Pick<
  EntryChunk,
  'entryId' | 'userId' | 'chunkIndex' | 'content' | 'embedding'
>;

@Injectable()
export class EntryChunksRepository {
  constructor(
    @InjectRepository(EntryChunk)
    private readonly repo: Repository<EntryChunk>,
  ) {}

  createMany(inputs: CreateChunkInput[]): Promise<EntryChunk[]> {
    const chunks = this.repo.create(inputs);
    return this.repo.save(chunks);
  }
}
