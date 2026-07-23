import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Entry } from './entry.entity';

@Entity('entry_chunks')
export class EntryChunk {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  entryId!: string;

  @ManyToOne(() => Entry, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entryId' })
  entry!: Entry;

  @Index()
  @Column('uuid')
  userId!: string;

  @Column('int')
  chunkIndex!: number;

  @Column('text')
  content!: string;

  @Column({ type: 'vector', length: 1536 })
  embedding!: number[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
