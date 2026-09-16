import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { EntriesModule } from '../entries/entries.module';
import { EmbeddingsModule } from '../../infrastructure/embeddings/embeddings.module';

@Module({
  imports: [EntriesModule, EmbeddingsModule],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
