import { registerAs } from '@nestjs/config';
import { Environment } from './env.validation';

export default registerAs('app', () => {
  const env = (process.env.NODE_ENV ?? Environment.Development) as Environment;

  const isDeployed =
    env === Environment.Production || env === Environment.Staging;

  const allowlist = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    env,
    port: parseInt(process.env.PORT ?? '3000', 10),
    isDeployed,
    corsOrigins: isDeployed ? allowlist : true,
    // Where the browser is sent after Google sign-in
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  };
});
