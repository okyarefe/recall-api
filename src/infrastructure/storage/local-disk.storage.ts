import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { StorageProvider } from './storage.interface';

@Injectable()
export class LocalDiskStorage implements StorageProvider {
  private readonly root = join(process.cwd(), 'uploads');

  async put(buffer: Buffer, originalName: string): Promise<string> {
    await mkdir(this.root, { recursive: true });
    const key = `${randomUUID()}${extname(originalName)}`;
    await writeFile(join(this.root, key), buffer);
    return key;
  }
}
