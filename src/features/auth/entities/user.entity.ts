import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  // null for users who signed in with Google only
  @Column({ type: 'varchar', nullable: true })
  password!: string | null;

  // Google's permanent id for this user (profile.id); null for email/password users
  @Column({ type: 'varchar', unique: true, nullable: true })
  googleId!: string | null;
}
