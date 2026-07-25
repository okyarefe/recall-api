import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { Environment } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.enableCors({
    origin: config.getOrThrow<string[] | boolean>('app.corsOrigins'),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const port = config.getOrThrow<number>('app.port');
  const env = config.getOrThrow<Environment>('app.env');

  await app.listen(port);

  Logger.log(`Recall API listening on port ${port} [env=${env}]`, 'Bootstrap');
}
bootstrap();
