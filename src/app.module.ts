import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { LoggerMiddleware } from './common/logger.middleware';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EntriesModule } from './entries/entries.module';
import { Entry } from './entries/entities/entry.entity';
import { EntryChunk } from './entries/entities/entry-chunk.entity';
import { LlmModule } from './llm/llm.module';
import { SearchModule } from './search/search.module';
import { QaModule } from './qa/qa.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import openaiConfig from './config/openai.config';
import { Environment, validate } from './config/env.validation';
import jwtConfig from './config/jwt.config';
import { AuthModule } from './auth/auth.module';
import { TestModule } from './test/test.module';
import { User } from './auth/entities/user.entity';

const nodeEnv = (process.env.NODE_ENV ??
  Environment.Development) as Environment;

const isDeployed =
  nodeEnv === Environment.Production || nodeEnv === Environment.Staging;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: `.env.${nodeEnv}`,
      ignoreEnvFile: isDeployed,
      load: [appConfig, databaseConfig, openaiConfig, jwtConfig],
      validate,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        url: config.getOrThrow<string>('database.url'),
        entities: [Entry, EntryChunk, User],
        synchronize: config.getOrThrow<boolean>('database.synchronize'),
        logging: config.getOrThrow<boolean>('database.logging'),
        ssl: config.getOrThrow<boolean>('database.ssl')
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),
    EntriesModule,
    LlmModule,
    SearchModule,
    QaModule,
    AuthModule,
    TestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
