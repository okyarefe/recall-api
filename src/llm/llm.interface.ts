export const LLM_PROVIDER = Symbol('LLM_PROVIDER');

export interface LlmGenerateParams {
  system?: string;
  user: string;
}

export interface LlmProvider {
  generate(params: LlmGenerateParams): Promise<string>;
}
