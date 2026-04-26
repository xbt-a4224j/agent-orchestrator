import { createHash } from "node:crypto";
import { ok, err, LLMPermanentError, type Result } from "./errors";
import type { ILLMClient, LLMCallResult, LLMCallOptions } from "./llm";
import type { Step } from "./schemas";

export interface RecordedCall {
  prompt_hash: string;
  output: string;
  tokens_in: number;
  tokens_out: number;
  cost_cents: number;
}

export interface RecordedRun {
  calls: RecordedCall[];
  index: Map<string, RecordedCall>;
}

export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex");
}

export function recordRun(steps: Step[], llmCalls: RecordedCall[]): RecordedRun {
  const index = new Map<string, RecordedCall>();
  for (const call of llmCalls) {
    index.set(call.prompt_hash, call);
  }
  return { calls: llmCalls, index };
}

export class FixtureLLMClient implements ILLMClient {
  readonly model: string;
  private recorded: RecordedRun;

  constructor(model: string, recorded: RecordedRun) {
    this.model = model;
    this.recorded = recorded;
  }

  async call(
    prompt: string,
    _opts?: LLMCallOptions
  ): Promise<Result<LLMCallResult, LLMPermanentError>> {
    const hash = hashPrompt(prompt);
    const fixture = this.recorded.index.get(hash);

    if (!fixture) {
      return err(
        new LLMPermanentError(`No fixture found for prompt hash: ${hash.slice(0, 8)}…`, 404)
      );
    }

    return ok({
      output: fixture.output,
      tokens_in: fixture.tokens_in,
      tokens_out: fixture.tokens_out,
      cost_cents: fixture.cost_cents,
      raw_response: { fixture: true },
    });
  }
}

export class CapturingLLMClient implements ILLMClient {
  readonly model: string;
  private inner: ILLMClient;
  readonly captured: RecordedCall[] = [];

  constructor(inner: ILLMClient) {
    this.model = inner.model;
    this.inner = inner;
  }

  async call(
    prompt: string,
    opts?: LLMCallOptions
  ): Promise<Result<LLMCallResult, LLMPermanentError | import("./errors").LLMTransientError>> {
    const result = await this.inner.call(prompt, opts);
    if (result.ok) {
      this.captured.push({
        prompt_hash: hashPrompt(prompt),
        output: result.value.output,
        tokens_in: result.value.tokens_in,
        tokens_out: result.value.tokens_out,
        cost_cents: result.value.cost_cents,
      });
    }
    return result;
  }
}
