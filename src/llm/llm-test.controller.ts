import { Body, Controller, Inject, Post } from '@nestjs/common';
import { LLM_PROVIDER, type LlmProvider } from './llm.interface';

@Controller('llm')
export class LlmTestController {
  constructor(@Inject(LLM_PROVIDER) private readonly llm: LlmProvider) {}

  @Post('test')
  async test(@Body('prompt') prompt: string): Promise<{ answer: string }> {
    const answer = await this.llm.generate(prompt);
    return { answer };
  }
}
