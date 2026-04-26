import { describe, it, expect, vi, beforeEach } from "vitest";
import { LLMClient } from "../src/llm";
import { LLMTransientError, LLMPermanentError } from "../src/errors";
import { APIError, APIConnectionError } from "@anthropic-ai/sdk";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@anthropic-ai/sdk")>();
  return {
    ...actual,
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
  };
});

beforeEach(() => {
  mockCreate.mockReset();
});

function makeAPIError(message: string, status: number): APIError {
  return new APIError(status, undefined, message, undefined);
}

function makeConnectionError(): APIConnectionError {
  return new APIConnectionError({ message: "connection refused" });
}

describe("LLMClient", () => {
  const client = new LLMClient({ apiKey: "test-key", model: "claude-sonnet-4-6" });

  it("returns ok result on success", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Hello world" }],
      usage: { input_tokens: 10, output_tokens: 20 },
    });

    const result = await client.call("test prompt");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.output).toBe("Hello world");
      expect(result.value.tokens_in).toBe(10);
      expect(result.value.tokens_out).toBe(20);
      expect(typeof result.value.cost_cents).toBe("number");
    }
  });

  it("returns LLMTransientError on 5xx", async () => {
    mockCreate.mockRejectedValueOnce(makeAPIError("server error", 503));
    const result = await client.call("test prompt");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(LLMTransientError);
      expect(result.error.code).toBe("llm_5xx");
    }
  });

  it("returns LLMPermanentError on 4xx", async () => {
    mockCreate.mockRejectedValueOnce(makeAPIError("bad request", 400));
    const result = await client.call("test prompt");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(LLMPermanentError);
      expect(result.error.code).toBe("llm_4xx");
    }
  });

  it("returns LLMTransientError on network error", async () => {
    mockCreate.mockRejectedValueOnce(makeConnectionError());
    const result = await client.call("test prompt");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(LLMTransientError);
    }
  });
});
