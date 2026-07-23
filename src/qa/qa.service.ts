import { Inject, Injectable } from '@nestjs/common';
import { LLM_PROVIDER, type LlmProvider } from '../llm/llm.interface';
import { SearchService } from '../search/search.service';

@Injectable()
export class QaService {
  constructor(
    private readonly searchService: SearchService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
  ) {}

  async ask(userId: string, question: string) {
    const chunks = await this.searchService.search(userId, question);
    const context = chunks
      .map((chunk, index) => `[${index + 1}] ${chunk.content}`)
      .join('\n\n');

    console.log('Context we are sending', context);

    const system =
      'You answer questions using ONLY the provided context. ' +
      'If the answer is not in the context, say you do not know. ' +
      'Do not invent information.';
    const user = `Context:\n${context}\n\nQuestion: ${question}`;

    const answer = await this.llm.generate({ system, user });

    return { answer, sources: chunks };
  }
}
