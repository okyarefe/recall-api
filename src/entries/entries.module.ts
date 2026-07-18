import { Module } from '@nestjs/common';
import { EntriesService } from './entries.service';
import { EntriesController } from './entries.controller';
import { Entry } from './entities/entry.entity';
import { EntriesRepository } from './entries.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
@Module({
  imports: [TypeOrmModule.forFeature([Entry])],
  controllers: [EntriesController],
  // EntriesRepository is provided so it can be injected into EntriesService,
  // and exported so later modules (search, qa, ingestion) can reuse it.
  providers: [EntriesService, EntriesRepository],
  exports: [EntriesRepository],
})
export class EntriesModule {}
