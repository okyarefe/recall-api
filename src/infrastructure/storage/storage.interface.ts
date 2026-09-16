export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface StorageProvider {
  put(buffer: Buffer, originalName: string): Promise<string>;
}
