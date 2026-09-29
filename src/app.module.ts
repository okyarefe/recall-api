import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { LoggerMiddleware } from './common/logger.middleware';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EntriesModule } from './features/entries/entries.module';
import { LlmModule } from './infrastructure/llm/llm.module';
import { SearchModule } from './features/search/search.module';
import { QaModule } from './features/qa/qa.module';
import appConfig from './config/app.config';
import typeormConfig from './config/typeorm.config';
import openaiConfig from './config/openai.config';
import { Environment, validate } from './config/env.validation';
import jwtConfig from './config/jwt.config';
import googleConfig from './config/google.config';
import { AuthModule } from './features/auth/auth.module';
import { TestModule } from './test/test.module';

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
      load: [appConfig, typeormConfig, openaiConfig, jwtConfig, googleConfig],
      validate,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions =>
        config.getOrThrow<TypeOrmModuleOptions>('typeorm'),
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
