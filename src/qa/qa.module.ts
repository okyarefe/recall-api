import { Module } from '@nestjs/common';
import { QaController } from './qa.controller';
import { QaService } from './qa.service';
import { SearchModule } from '../search/search.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [SearchModule, LlmModule],
  controllers: [QaController],
  providers: [QaService],
})
export class QaModule {}
