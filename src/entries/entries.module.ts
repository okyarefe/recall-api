import { Module } from '@nestjs/common';
import { EntriesService } from './entries.service';
import { EntriesController } from './entries.controller';
import { Entry } from './entities/entry.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
@Module({
  imports: [TypeOrmModule.forFeature([Entry])],
  controllers: [EntriesController],
  providers: [EntriesService],
})
export class EntriesModule {}
