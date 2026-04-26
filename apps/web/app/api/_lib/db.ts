import { createClient } from "@agent-orchestrator/db";

let _db: ReturnType<typeof createClient> | null = null;

export function getDb(): ReturnType<typeof createClient> {
  if (!_db) {
    const url = process.env["DATABASE_URL"];
    if (!url) throw new Error("DATABASE_URL not set");
    _db = createClient(url);
  }
  return _db;
}
