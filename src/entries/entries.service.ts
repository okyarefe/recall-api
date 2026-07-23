import { Inject, Injectable } from '@nestjs/common';
import { EntriesRepository } from './entries.repository';
import { CreateEntryDto } from './dto/create-entry.dto';
import { Entry } from './entities/entry.entity';
import {
  STORAGE_PROVIDER,
  type StorageProvider,
} from '../storage/storage.interface';
import { ExtractionService } from '../extraction/extraction.service';

@Injectable()
export class EntriesService {
  constructor(
    private readonly entriesRepository: EntriesRepository,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly extraction: ExtractionService,
  ) {}

  async createFileEntry(
    userId: string,
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<Entry> {
    const content = await this.extraction.extract(buffer, mimeType);
    const fileKey = await this.storage.put(buffer, originalName);
    return this.entriesRepository.create({
      userId,
      type: 'file',
      fileKey,
      content,
    });
  }

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
