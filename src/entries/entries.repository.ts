import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entry } from './entities/entry.entity';

export type CreateEntryInput = Pick<
  Entry,
  'userId' | 'type' | 'content' | 'sourceUrl'
>;

@Injectable()
export class EntriesRepository {
  constructor(
    @InjectRepository(Entry)
    private readonly repo: Repository<Entry>,
  ) {}

  create(data: CreateEntryInput): Promise<Entry> {
    const entry = this.repo.create(data);
    return this.repo.save(entry);
  }

  findByUser(userId: string): Promise<Entry[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  findOneOwned(userId: string, id: string): Promise<Entry | null> {
    return this.repo.findOne({ where: { id, userId } });
  }

  async deleteOwned(userId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete({ id, userId });
    return result.affected === 1;
  }
}
