import { Inject, Injectable } from '@nestjs/common';
import {
  EMBEDDINGS_PROVIDER,
  type EmbeddingsProvider,
} from '../embeddings/embeddings.interface';
import { EntryChunksRepository } from '../entries/entry-chunks.repository';

@Injectable()
export class SearchService {
  constructor(
    @Inject(EMBEDDINGS_PROVIDER)
    private readonly embeddings: EmbeddingsProvider,
    private readonly entryChunksRepository: EntryChunksRepository,
  ) {}

  async search(userId: string, query: string, limit = 5) {
    const [queryVector] = await this.embeddings.embed([query]);
    const chunks = await this.entryChunksRepository.search(
      userId,
      queryVector,
      limit,
    );
    return chunks.map((chunk) => ({
      entryId: chunk.entryId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
    }));
  }
}
