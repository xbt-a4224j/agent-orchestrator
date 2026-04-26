import { describe, it, expect } from "vitest";
import {
  PlannerError,
  SpecialistError,
  ToneCheckExhausted,
  ReplayMismatch,
  LLMTransientError,
  LLMPermanentError,
  ok,
  err,
} from "../src/errors";

describe("error classes", () => {
  it("PlannerError has correct code", () => {
    const e = new PlannerError("bad dag");
    expect(e).toBeInstanceOf(PlannerError);
    expect(e.code).toBe("planner_invalid_dag");
    expect(e.message).toBe("bad dag");
  });

  it("SpecialistError carries agent + attempt", () => {
    const e = new SpecialistError("failed", "outreach_writer", 2);
    expect(e).toBeInstanceOf(SpecialistError);
    expect(e.code).toBe("specialist_failed");
    expect(e.agent).toBe("outreach_writer");
    expect(e.attempt).toBe(2);
  });

  it("ToneCheckExhausted carries attempt count", () => {
    const e = new ToneCheckExhausted(2);
    expect(e.code).toBe("tone_exhausted");
    expect(e.attempts).toBe(2);
  });

  it("ReplayMismatch carries expected/actual", () => {
    const e = new ReplayMismatch({ x: 1 }, { x: 2 });
    expect(e.code).toBe("replay_mismatch");
    expect(e.expected).toEqual({ x: 1 });
    expect(e.actual).toEqual({ x: 2 });
  });

  it("LLMTransientError is retryable", () => {
    const e = new LLMTransientError("server error", 503);
    expect(e.code).toBe("llm_5xx");
    expect(e.retryable).toBe(true);
    expect(e.statusCode).toBe(503);
  });

  it("LLMPermanentError is not retryable", () => {
    const e = new LLMPermanentError("bad request", 400);
    expect(e.code).toBe("llm_4xx");
    expect(e.retryable).toBe(false);
  });
});

describe("Result helpers", () => {
  it("ok() creates a success result", () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(42);
  });

  it("err() creates a failure result", () => {
    const result = err(new PlannerError("bad"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("planner_invalid_dag");
  });

  it("Result is narrowable by ok flag", () => {
    const result: ReturnType<typeof ok<string>> | ReturnType<typeof err<PlannerError>> =
      ok("hello");
    if (result.ok) {
      const s: string = result.value;
      expect(s).toBe("hello");
    }
  });
});
