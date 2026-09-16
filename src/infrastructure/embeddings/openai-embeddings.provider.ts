import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { EmbeddingsProvider } from './embeddings.interface';

@Injectable()
export class OpenAiEmbeddingsProvider implements EmbeddingsProvider {
  private readonly client: OpenAI;
  private readonly model = 'text-embedding-3-small';

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.getOrThrow<string>('openai.apiKey'),
    });
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
    });
    return response.data.map((item) => item.embedding);
  }
}
