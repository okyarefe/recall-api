import { Module } from '@nestjs/common';
import { QaController } from './qa.controller';
import { QaService } from './qa.service';
import { SearchModule } from '../search/search.module';
import { LlmModule } from '../../infrastructure/llm/llm.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SearchModule, LlmModule, AuthModule],
  controllers: [QaController],
  providers: [QaService],
})
export class QaModule {}
