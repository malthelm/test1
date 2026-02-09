import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const migrationsDir = path.join(process.cwd(), "supabase", "migrations");

test("phase 1 security migration exists with membership + RLS scaffolding", async () => {
  const files = await fs.readdir(migrationsDir);
  const phase1 = files.find((file) => file.includes("phase1_security_foundations"));

  assert.ok(phase1, "expected phase 1 security migration file");

  const sql = await fs.readFile(path.join(migrationsDir, phase1!), "utf8");

  assert.match(sql, /create table if not exists public\.workspace_memberships/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /create policy transcripts_member_read/i);
});
