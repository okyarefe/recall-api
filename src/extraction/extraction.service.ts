import { BadRequestException, Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class ExtractionService {
  async extract(buffer: Buffer, mimeType: string): Promise<string> {
    switch (mimeType) {
      case 'text/plain':
        return buffer.toString('utf-8');
      case 'application/pdf':
        return this.extractPdf(buffer);
      default:
        throw new BadRequestException(`Unsupported file type: ${mimeType}`);
    }
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
}
