import { Injectable } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { getEncoding } from 'js-tiktoken';

@Injectable()
export class ChunkingService {
  private readonly splitter: RecursiveCharacterTextSplitter;

  constructor() {
    const encoder = getEncoding('cl100k_base');
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
