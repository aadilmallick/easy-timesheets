import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";
import { ENV_VARS } from "@/utils/constants";

const sql = neon(ENV_VARS.DATABASE_URL);

async function migrate() {
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");

  // Split on semicolons but keep DO $$ blocks together
  const statements: string[] = [];
  let current = "";
  let inDollarQuote = false;

  for (const line of schema.split("\n")) {
    if (line.includes("$$")) {
      inDollarQuote = !inDollarQuote;
    }
    current += line + "\n";
    if (!inDollarQuote && line.trim().endsWith(";")) {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = "";
    }
  }

  for (const statement of statements) {
    try {
      await sql.query(statement);
      console.log("OK:", statement.slice(0, 60).replace(/\n/g, " "));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists")) {
        console.log("Skip:", statement.slice(0, 60).replace(/\n/g, " "));
      } else {
        console.error("Error:", msg);
      }
    }
  }
  console.log("Migration complete.");
}

migrate();
