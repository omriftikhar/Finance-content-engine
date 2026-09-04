import type {GenerateOptions, GenerateResult, TextModel, TextTask} from './types';

/**
 * Deterministic mock text model.
 *
 * Runs with zero API keys and returns *structured* placeholder output so the
 * full pipeline (research → script → storyboard → packaging) produces something
 * coherent locally. The engines below fall back to their own deterministic
 * builders; this adapter mainly exercises the provider contract and cost ledger.
 */
export class MockTextModel implements TextModel {
  readonly name = 'mock';
  readonly model = 'mock';

  async generate(task: TextTask, prompt: string, _opts?: GenerateOptions): Promise<GenerateResult> {
    const text = `[mock:${task}] ${prompt.slice(0, 200)}`;
    return {
      text,
      provider: this.name,
      model: this.model,
      usage: {inputTokens: Math.ceil(prompt.length / 4), outputTokens: Math.ceil(text.length / 4)},
      costUsd: 0,
    };
  }
}
