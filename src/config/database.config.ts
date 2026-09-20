import { Environment } from './env.validation';

/**
 * Database connection settings — ORM-agnostic.
 *
 * These are the facts any Postgres client needs: where the database is, and
 * how to talk to it. Nothing here is specific to TypeORM, so swapping the ORM
 * leaves this file untouched.
 *
 * Exported as a function, not a constant, so `process.env` is read when it is
 * called rather than when the module is imported — the TypeORM CLI loads
 * dotenv itself, and that has to happen first.
 */
export const databaseConnection = () => {
  const env = (process.env.NODE_ENV ?? Environment.Development) as Environment;

  return {
    url: process.env.DATABASE_URL,
    logging: env === Environment.Development,
    ssl:
      env === Environment.Production || env === Environment.Staging
        ? { rejectUnauthorized: false }
        : false,
  };
};
