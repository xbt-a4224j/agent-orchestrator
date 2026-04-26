type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  event: string;
  run_id?: string;
  step_id?: string;
  agent?: string;
  status?: string;
  [key: string]: unknown;
}

export function log(entry: LogEntry): void {
  process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
}
