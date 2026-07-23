import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LlmGenerateParams, LlmProvider } from './llm.interface';

@Injectable()
export class OpenAiLlmProvider implements LlmProvider {
  private readonly client: OpenAI;
  private readonly model = 'gpt-4o-mini';

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.get<string>('OPEN_AI_KEY'),
    });
  }

  async generate({ system, user }: LlmGenerateParams): Promise<string> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    if (system) {
      messages.push({ role: 'system', content: system });
    }
    messages.push({ role: 'user', content: user });
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
    });
    return response.choices[0]?.message?.content ?? '';
  }
}
