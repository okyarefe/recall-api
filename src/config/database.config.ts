import { registerAs } from '@nestjs/config';
import { Environment } from './env.validation';

export default registerAs('database', () => {
  const env = (process.env.NODE_ENV ?? Environment.Development) as Environment;

  return {
    url: process.env.DATABASE_URL,
    synchronize: env !== Environment.Production,
    logging: env === Environment.Development,
    ssl: env === Environment.Production || env === Environment.Staging,
  };
});
