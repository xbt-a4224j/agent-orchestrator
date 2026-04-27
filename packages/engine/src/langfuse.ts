import { Langfuse, type LangfuseTraceClient } from "langfuse";

let _client: Langfuse | null = null;

function getClient(): Langfuse | null {
  if (!process.env["LANGFUSE_PUBLIC_KEY"]) return null;
  if (!_client) {
    _client = new Langfuse({
      publicKey: process.env["LANGFUSE_PUBLIC_KEY"],
      secretKey: process.env["LANGFUSE_SECRET_KEY"] ?? "",
      baseUrl: process.env["LANGFUSE_HOST"] ?? "https://cloud.langfuse.com",
      flushAt: 1,
    });
  }
  return _client;
}

export function startTrace(opts: {
  runId: string;
  targetAccount: string;
  personaRole: string;
  playbook: string;
}): LangfuseTraceClient | null {
  const lf = getClient();
  if (!lf) return null;
  try {
    return lf.trace({
      id: opts.runId,
      name: "campaign-run",
      tags: [opts.playbook, opts.personaRole],
      metadata: {
        target_account: opts.targetAccount,
        persona_role: opts.personaRole,
        playbook: opts.playbook,
      },
    });
  } catch {
    return null;
  }
}

export function recordGeneration(
  trace: LangfuseTraceClient | null,
  opts: {
    agent: string;
    model: string;
    prompt: string;
    output: string;
    tokensIn: number;
    tokensOut: number;
    costCents: number;
    attempt: number;
    latencyMs: number;
  }
): void {
  if (!trace) return;
  try {
    const gen = trace.generation({
      name: opts.agent,
      model: opts.model,
      input: opts.prompt,
      output: opts.output,
      usage: { input: opts.tokensIn, output: opts.tokensOut },
      metadata: {
        attempt: opts.attempt,
        cost_cents: opts.costCents,
        latency_ms: opts.latencyMs,
      },
    });
    gen.end();
  } catch {
    // non-fatal
  }
}

export function scoreTrace(
  trace: LangfuseTraceClient | null,
  opts: { name: string; value: number; comment?: string }
): void {
  if (!trace) return;
  try {
    trace.score({ name: opts.name, value: opts.value, comment: opts.comment });
  } catch {
    // non-fatal
  }
}

export async function flushLangfuse(): Promise<void> {
  try {
    await _client?.flushAsync();
  } catch {
    // non-fatal
  }
}
