import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EntriesModule } from './entries/entries.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entry } from './entries/entities/entry.entity';
import { EntryChunk } from './entries/entities/entry-chunk.entity';
import { LlmModule } from './llm/llm.module';
import { SearchModule } from './search/search.module';
import { QaModule } from './qa/qa.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EntriesModule,
    LlmModule,
    SearchModule,
    QaModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'pwd123',
      database: 'recall_database',
      entities: [Entry, EntryChunk],
      synchronize: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
