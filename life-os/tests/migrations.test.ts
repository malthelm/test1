import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const supabaseDir = path.join(process.cwd(), "supabase");
const migrationsDir = path.join(supabaseDir, "migrations");
const rlsDir = path.join(supabaseDir, "tests", "rls");

test("phase 1 security migrations include membership + RLS scaffolding", async () => {
  const files = await fs.readdir(migrationsDir);
  const phase1 = files.find((file) => file.includes("phase1_security_foundations"));

  assert.ok(phase1, "expected phase 1 security migration file");

  const sql = await fs.readFile(path.join(migrationsDir, phase1), "utf8");

  assert.match(sql, /create table if not exists public\.workspace_memberships/i);
  assert.match(sql, /create or replace function public\.user_has_workspace_access/i);
  assert.match(sql, /alter table public\.transcripts enable row level security/i);
  assert.match(sql, /create policy transcripts_member_read/i);
  assert.match(sql, /create policy idempotency_member_read/i);
});

test("phase 1 follow-up migration hardens commit rpc + adds write policy scaffold", async () => {
  const files = await fs.readdir(migrationsDir);
  const followUp = files.find((file) => file.includes("phase1_rls_and_commit_function_hardening"));

  assert.ok(followUp, "expected follow-up phase 1 hardening migration file");

  const sql = await fs.readFile(path.join(migrationsDir, followUp), "utf8");

  assert.match(sql, /create or replace function public\.commit_derived_from_transcript/i);
  assert.match(sql, /on conflict \(key\)\s+do update set result_payload = public\.idempotency_keys\.result_payload/i);
  assert.match(sql, /create policy transcripts_member_insert/i);
  assert.match(sql, /create policy todos_member_insert/i);
});

test("phase 1 role-based policy migration defines role helpers + write/update/delete policies", async () => {
  const files = await fs.readdir(migrationsDir);
  const rolePolicies = files.find((file) => file.includes("phase1_role_based_write_policies"));

  assert.ok(rolePolicies, "expected role-based write policy migration file");

  const sql = await fs.readFile(path.join(migrationsDir, rolePolicies), "utf8");

  assert.match(sql, /create or replace function public\.workspace_role_rank/i);
  assert.match(sql, /create or replace function public\.user_has_workspace_role_at_least/i);

  assert.match(sql, /create policy transcripts_member_update/i);
  assert.match(sql, /create policy transcripts_owner_delete/i);
  assert.match(sql, /create policy todos_member_update/i);
  assert.match(sql, /create policy todos_owner_delete/i);
  assert.match(sql, /create policy memberships_owner_update/i);
  assert.match(sql, /create policy memberships_owner_delete/i);
});

test("RLS matrix starter covers all core workspace-scoped tables", async () => {
  const matrixPath = path.join(rlsDir, "policy-matrix-starter.json");
  const raw = await fs.readFile(matrixPath, "utf8");
  const parsed = JSON.parse(raw) as { tables: Array<{ name: string }> };

  const names = new Set(parsed.tables.map((entry) => entry.name));

  for (const table of [
    "workspaces",
    "workspace_memberships",
    "transcripts",
    "todos",
    "audit_events",
    "idempotency_keys",
  ]) {
    assert.ok(names.has(table), `matrix missing table: ${table}`);
  }
});
