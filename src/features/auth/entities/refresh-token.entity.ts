import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  userId!: string;

  // Not a separate column: reuses userId as the foreign key to users
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  // SHA-256 of the raw token; the raw token only ever lives in the cookie
  @Column({ unique: true })
  tokenHash!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  // null = still valid; set when rotated or logged out
  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
