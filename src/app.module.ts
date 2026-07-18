import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EntriesModule } from './entries/entries.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entry } from './entries/entities/entry.entity';

@Module({
  imports: [
    EntriesModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'pwd123',
      database: 'recall_database',
      entities: [Entry],
      synchronize: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
