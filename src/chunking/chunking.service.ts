import { Injectable } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { getEncoding } from 'js-tiktoken';

@Injectable()
export class ChunkingService {
  private readonly splitter: RecursiveCharacterTextSplitter;

  constructor() {
    const encoder = getEncoding('cl100k_base');
    // TODO: chunk size strategy per content type — tune chunkSize/overlap and use
    // structure-aware splitting (e.g. per section/project) for structured docs;
    // smaller chunks sharpen retrieval precision, larger keep more context.
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 512,
      chunkOverlap: 64,
      lengthFunction: (text) => encoder.encode(text).length,
    });
  }

  chunk(text: string): Promise<string[]> {
    return this.splitter.splitText(text);
  }
}
