import { Module } from '@nestjs/common';
import { EMBEDDINGS_PROVIDER } from './embeddings.interface';
import { OpenAiEmbeddingsProvider } from './openai-embeddings.provider';

@Module({
  providers: [
    { provide: EMBEDDINGS_PROVIDER, useClass: OpenAiEmbeddingsProvider },
  ],
  exports: [EMBEDDINGS_PROVIDER],
})
export class EmbeddingsModule {}
