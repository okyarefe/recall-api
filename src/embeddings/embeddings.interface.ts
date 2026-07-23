export const EMBEDDINGS_PROVIDER = Symbol('EMBEDDINGS_PROVIDER');

export interface EmbeddingsProvider {
  embed(texts: string[]): Promise<number[][]>;
}
