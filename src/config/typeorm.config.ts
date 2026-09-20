import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { config as dotenvConfig } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Entry } from '../features/entries/entities/entry.entity';
import { EntryChunk } from '../features/entries/entities/entry-chunk.entity';
import { User } from '../features/auth/entities/user.entity';
import { databaseConnection } from './database.config';
import { Environment } from './env.validation';

const env = (process.env.NODE_ENV ?? Environment.Development) as Environment;

// The TypeORM CLI runs outside Nest, so ConfigModule has not loaded the env
// file by the time `connectionSource` below is constructed.
dotenvConfig({ path: `.env.${env}` });

/**
 * What the TypeORM CLI needs: the connection, plus the ORM-specific options.
 * `entities` is an explicit list because the CLI has no Nest modules to
 * collect them from.
 */
const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  ...databaseConnection(),
  entities: [Entry, EntryChunk, User],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
};

/**
 * What the Nest app needs: the same options, plus `autoLoadEntities` — a
 * NestJS-only flag that picks up entities from TypeOrmModule.forFeature().
 */
export default registerAs('typeorm', (): TypeOrmModuleOptions => ({
  ...dataSourceOptions,
  autoLoadEntities: true,
}));

export const connectionSource = new DataSource(dataSourceOptions);
