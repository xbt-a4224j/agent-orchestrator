import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "../migrations");

export async function migrate(connectionString: string): Promise<void> {
  const sql = postgres(connectionString, { max: 1 });

  try {
    // Bootstrap the migrations table
    await sql`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const applied = await sql<{ name: string }[]>`
      SELECT name FROM _migrations ORDER BY id
    `;
    const appliedSet = new Set(applied.map((r) => r.name));

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) continue;

      const sqlContent = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      console.log(`[migrate] Applying ${file}…`);

      await sql.begin(async (tx) => {
        await tx.unsafe(sqlContent);
        await tx`INSERT INTO _migrations (name) VALUES (${file})`;
      });

      console.log(`[migrate] Applied ${file}`);
    }
  } finally {
    await sql.end();
  }
}

// Run when called directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL not set");
  migrate(url)
    .then(() => console.log("[migrate] Done"))
    .catch((e) => { console.error(e); process.exit(1); });
}
