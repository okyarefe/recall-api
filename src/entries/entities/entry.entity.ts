import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const ENTRY_TYPES = ['link', 'note', 'file'] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const ENTRY_STATUSES = [
  'pending',
  'processing',
  'ready',
  'failed',
] as const;
export type EntryStatus = (typeof ENTRY_STATUSES)[number];

@Entity('entries')
export class Entry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Owner of this entry. Every query in the app filters on this for tenant isolation.
  // Becomes a real FK relation to the User entity once auth/users exists.
  @Index()
  @Column('uuid')
  userId!: string;

  @Column({ type: 'enum', enum: ENTRY_TYPES })
  type!: EntryType;

  // Present only for `link` entries.
  @Column({ type: 'text', nullable: true })
  sourceUrl!: string | null;

  // Storage key for `file` entries (set when we add uploads).
  @Column({ type: 'text', nullable: true })
  fileKey!: string | null;

  // Derived during ingestion (article title, filename, etc.).
  @Column({ type: 'text', nullable: true })
  title!: string | null;

  // The raw/extracted text. Null until ingestion runs; chunks + embeddings live in a
  // separate table added with the embeddings phase.
  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ type: 'enum', enum: ENTRY_STATUSES, default: 'pending' })
  status!: EntryStatus;

  // Last failure reason when status = 'failed'.
  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
