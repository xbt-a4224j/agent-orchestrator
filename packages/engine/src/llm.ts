import Anthropic, { APIError, APIConnectionError } from "@anthropic-ai/sdk";
import { costCents } from "./cost";
import { LLMTransientError, LLMPermanentError, ok, err, type Result } from "./errors";

export interface LLMCallResult {
  output: string;
  tokens_in: number;
  tokens_out: number;
  cost_cents: number;
  raw_response: unknown;
}

export interface LLMCallOptions {
  system?: string;
  maxTokens?: number;
}

export interface ILLMClient {
  call(
    prompt: string,
    opts?: LLMCallOptions
  ): Promise<Result<LLMCallResult, LLMTransientError | LLMPermanentError>>;
  readonly model: string;
}

export class LLMClient implements ILLMClient {
  readonly model: string;
  private client: Anthropic;
  private _totalTokensIn = 0;
  private _totalTokensOut = 0;
  private _totalCostCents = 0;

  constructor(opts: { apiKey: string; model: string }) {
    this.model = opts.model;
    this.client = new Anthropic({ apiKey: opts.apiKey });
  }

  get totalTokensIn() { return this._totalTokensIn; }
  get totalTokensOut() { return this._totalTokensOut; }
  get totalCostCents() { return this._totalCostCents; }

  async call(
    prompt: string,
    opts: LLMCallOptions = {}
  ): Promise<Result<LLMCallResult, LLMTransientError | LLMPermanentError>> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: opts.maxTokens ?? 2048,
        system: opts.system,
        messages: [{ role: "user", content: prompt }],
      });

      const tokens_in = response.usage.input_tokens;
      const tokens_out = response.usage.output_tokens;
      const cost = costCents(this.model, tokens_in, tokens_out);
      const output =
        response.content[0]?.type === "text" ? response.content[0].text : "";

      this._totalTokensIn += tokens_in;
      this._totalTokensOut += tokens_out;
      this._totalCostCents += cost;

      return ok({
        output,
        tokens_in,
        tokens_out,
        cost_cents: cost,
        raw_response: response,
      });
    } catch (e) {
      return classifyError(e);
    }
  }
}

function classifyError(
  e: unknown
): Result<never, LLMTransientError | LLMPermanentError> {
  if (e instanceof APIConnectionError) {
    return err(new LLMTransientError("Network error connecting to Anthropic", 503, e));
  }

  if (e instanceof APIError) {
    const status = e.status ?? 500;
    if (status === 408 || status === 429 || status >= 500) {
      return err(new LLMTransientError(e.message, status, e));
    }
    return err(new LLMPermanentError(e.message, status, e));
  }

  return err(new LLMPermanentError(String(e), 500, e));
}
