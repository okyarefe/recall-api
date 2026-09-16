import { Module } from '@nestjs/common';
import { EntriesService } from './entries.service';
import { EntriesController } from './entries.controller';
import { Entry } from './entities/entry.entity';
import { EntryChunk } from './entities/entry-chunk.entity';
import { EntriesRepository } from './entries.repository';
import { EntryChunksRepository } from './entry-chunks.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { ExtractionModule } from './extraction/extraction.module';
import { ChunkingModule } from './chunking/chunking.module';
import { EmbeddingsModule } from '../../infrastructure/embeddings/embeddings.module';
import { AuthModule } from '../auth/auth.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Entry, EntryChunk]),
    StorageModule,
    ExtractionModule,
    ChunkingModule,
    EmbeddingsModule,
    AuthModule,
  ],
  controllers: [EntriesController],
  providers: [EntriesService, EntriesRepository, EntryChunksRepository],
  exports: [EntriesRepository, EntryChunksRepository],
})
export class EntriesModule {}
