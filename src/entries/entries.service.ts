import { Injectable } from '@nestjs/common';
import { EntriesRepository } from './entries.repository';
import { CreateEntryDto } from './dto/create-entry.dto';

@Injectable()
export class EntriesService {
  constructor(private readonly entriesRepository: EntriesRepository) {}

  create(userId: string, dto: CreateEntryDto) {
    return this.entriesRepository.create({
      userId,
      type: dto.type,
      content: dto.content ?? null,
      sourceUrl: dto.sourceUrl ?? null,
    });
  }

  findAll(userId: string) {
    return this.entriesRepository.findByUser(userId);
  }

  findOne(userId: string, id: string) {
    return this.entriesRepository.findOneOwned(userId, id);
  }

  remove(userId: string, id: string) {
    return this.entriesRepository.deleteOwned(userId, id);
  }
}
