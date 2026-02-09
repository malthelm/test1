import assert from "node:assert/strict";
import test from "node:test";

import { POST as parsePost } from "@/app/api/transcripts/parse/route";
import { POST as createPost } from "@/app/api/transcripts/create/route";
import { POST as commitPost } from "@/app/api/transcripts/commit-derived/route";
import { GET as listGet } from "@/app/api/transcripts/route";
import { GET as detailGet } from "@/app/api/transcripts/[id]/route";
import { GET as todosGet } from "@/app/api/todos/route";
import { GET as weeklyPlanGet } from "@/app/api/weekly-plan/route";
import { __resetLocalDbForTests } from "@/server/local-db";
import { __resetRepositoryForTests } from "@/server/repositories";

process.env.LIFE_OS_DB_FILE = "/tmp/life-os-test-db-routes.json";
process.env.LIFE_OS_PERSISTENCE = "local";

const workspaceHeaders = {
  "Content-Type": "application/json",
  "x-workspace-id": "ws-test",
};

test("transcript create -> parse -> commit flow", async () => {
  __resetRepositoryForTests();
  await __resetLocalDbForTests();

  const draft = `[SUMMARY]\nA\n[TIMELINE]\nB\n[TODOS]\nTask|later|low|online|none|ops|Malthe|2026-02-10|note\n[DECISIONS]\nC\n[MONEY]\nD\n[IDEAS]\nE\n[QUESTIONS]\nF`;

  const createRes = await createPost(
    new Request("http://localhost/api/transcripts/create", {
      method: "POST",
      body: JSON.stringify({ rawText: draft }),
      headers: workspaceHeaders,
    }),
  );
  const created = (await createRes.json()) as { id: string };
  assert.ok(created.id);

  const parseRes = await parsePost(
    new Request("http://localhost/api/transcripts/parse", {
      method: "POST",
      body: JSON.stringify({ draft }),
      headers: { "Content-Type": "application/json" },
    }),
  );
  const parsed = (await parseRes.json()) as { todos: unknown[]; confidence: { globalCritical: boolean } };
  assert.equal(parsed.confidence.globalCritical, false);
  assert.equal(parsed.todos.length, 1);

  const commitRes = await commitPost(
    new Request("http://localhost/api/transcripts/commit-derived", {
      method: "POST",
      body: JSON.stringify({
        transcriptId: created.id,
        todos: parsed.todos,
      }),
      headers: workspaceHeaders,
    }),
  );
  const committed = (await commitRes.json()) as {
    committedTodos: number;
    idempotencyKey: string;
    auditEventId: string;
  };
  assert.equal(committed.committedTodos, 1);

  const replayRes = await commitPost(
    new Request("http://localhost/api/transcripts/commit-derived", {
      method: "POST",
      body: JSON.stringify({
        transcriptId: created.id,
        todos: parsed.todos,
        idempotencyKey: committed.idempotencyKey,
      }),
      headers: workspaceHeaders,
    }),
  );

  const replay = (await replayRes.json()) as { auditEventId: string; committedTodos: number };
  assert.equal(replay.auditEventId, committed.auditEventId);
  assert.equal(replay.committedTodos, 1);

  const listRes = await listGet(
    new Request("http://localhost/api/transcripts?limit=5", { headers: { "x-workspace-id": "ws-test" } }),
  );
  const listed = (await listRes.json()) as { transcripts: Array<{ id: string }> };
  assert.equal(listed.transcripts.length, 1);
  assert.equal(listed.transcripts[0]?.id, created.id);

  const detailRes = await detailGet(
    new Request(`http://localhost/api/transcripts/${created.id}`, { headers: { "x-workspace-id": "ws-test" } }),
    { params: Promise.resolve({ id: created.id }) },
  );
  const detail = (await detailRes.json()) as {
    transcript: { id: string };
    todos: Array<{ title: string }>;
  };
  assert.equal(detail.transcript.id, created.id);
  assert.equal(detail.todos.length, 1);
  assert.equal(detail.todos[0]?.title, "Task");

  const todosRes = await todosGet(
    new Request("http://localhost/api/todos?limit=10", { headers: { "x-workspace-id": "ws-test" } }),
  );
  const todosJson = (await todosRes.json()) as { todos: Array<{ title: string; horizon: string }> };
  assert.equal(todosJson.todos.length, 1);
  assert.equal(todosJson.todos[0]?.title, "Task");
  assert.equal(todosJson.todos[0]?.horizon, "later");

  const weeklyOkRes = await weeklyPlanGet(
    new Request("http://localhost/api/weekly-plan?weekStart=2026-02-09", {
      headers: { "x-workspace-id": "ws-test" },
    }),
  );
  assert.equal(weeklyOkRes.status, 200);
  const weeklyOk = (await weeklyOkRes.json()) as {
    weekStart: string;
    todos: Array<{ title: string }>;
  };
  assert.equal(weeklyOk.weekStart, "2026-02-09");
  assert.equal(weeklyOk.todos.length, 1);
  assert.equal(weeklyOk.todos[0]?.title, "Task");

  const weeklyBadRes = await weeklyPlanGet(
    new Request("http://localhost/api/weekly-plan?weekStart=2026-02-10", {
      headers: { "x-workspace-id": "ws-test" },
    }),
  );
  assert.equal(weeklyBadRes.status, 400);
  const weeklyBad = (await weeklyBadRes.json()) as { error: string };
  assert.match(weeklyBad.error, /Monday/i);
});
