export abstract class EngineError extends Error {
  abstract readonly code: string;
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.cause = cause;
  }
}

export class PlannerError extends EngineError {
  readonly code = "planner_invalid_dag" as const;
}

export class SpecialistError extends EngineError {
  readonly code = "specialist_failed" as const;
  readonly agent: string;
  readonly attempt: number;

  constructor(message: string, agent: string, attempt: number, cause?: unknown) {
    super(message, cause);
    this.agent = agent;
    this.attempt = attempt;
  }
}

export class ToneCheckExhausted extends EngineError {
  readonly code = "tone_exhausted" as const;
  readonly attempts: number;

  constructor(attempts: number) {
    super(`Tone check exhausted after ${attempts} attempt(s)`);
    this.attempts = attempts;
  }
}

export class ReplayMismatch extends EngineError {
  readonly code = "replay_mismatch" as const;
  readonly expected: unknown;
  readonly actual: unknown;

  constructor(expected: unknown, actual: unknown) {
    super("Replay produced a different packet than the original run");
    this.expected = expected;
    this.actual = actual;
  }
}

export class LLMTransientError extends EngineError {
  readonly code = "llm_5xx" as const;
  readonly retryable = true;
  readonly statusCode: number;

  constructor(message: string, statusCode: number, cause?: unknown) {
    super(message, cause);
    this.statusCode = statusCode;
  }
}

export class LLMPermanentError extends EngineError {
  readonly code = "llm_4xx" as const;
  readonly retryable = false;
  readonly statusCode: number;

  constructor(message: string, statusCode: number, cause?: unknown) {
    super(message, cause);
    this.statusCode = statusCode;
  }
}

export type Result<T, E extends EngineError = EngineError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E extends EngineError>(error: E): Result<never, E> {
  return { ok: false, error };
}
