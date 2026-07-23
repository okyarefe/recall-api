import { Module } from '@nestjs/common';
import { LLM_PROVIDER } from './llm.interface';
import { OpenAiLlmProvider } from './openai-llm.provider';
import { LlmTestController } from './llm-test.controller';

@Module({
  controllers: [LlmTestController],
  providers: [{ provide: LLM_PROVIDER, useClass: OpenAiLlmProvider }],
  exports: [LLM_PROVIDER],
})
export class LlmModule {}
