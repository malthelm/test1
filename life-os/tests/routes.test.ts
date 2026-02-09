import assert from "node:assert/strict";
import test from "node:test";

import { POST as parsePost } from "@/app/api/transcripts/parse/route";
import { POST as createPost } from "@/app/api/transcripts/create/route";
import { POST as commitPost } from "@/app/api/transcripts/commit-derived/route";
import { GET as listGet } from "@/app/api/transcripts/route";
import { GET as detailGet } from "@/app/api/transcripts/[id]/route";
import { __resetLocalDbForTests } from "@/server/local-db";
import { __resetRepositoryForTests } from "@/server/repositories";

process.env.LIFE_OS_DB_FILE = "/tmp/life-os-test-db-routes.json";
process.env.LIFE_OS_PERSISTENCE = "local";

test("transcript create -> parse -> commit flow", async () => {
  __resetRepositoryForTests();
  await __resetLocalDbForTests();

  const draft = `[SUMMARY]\nA\n[TIMELINE]\nB\n[TODOS]\nTask|later|low|online|none|ops|Malthe|2026-02-20|note\n[DECISIONS]\nC\n[MONEY]\nD\n[IDEAS]\nE\n[QUESTIONS]\nF`;

  const createRes = await createPost(
    new Request("http://localhost/api/transcripts/create", {
      method: "POST",
      body: JSON.stringify({ workspaceId: "ws-test", rawText: draft }),
      headers: { "Content-Type": "application/json" },
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
        workspaceId: "ws-test",
        transcriptId: created.id,
        todos: parsed.todos,
      }),
      headers: { "Content-Type": "application/json" },
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
        workspaceId: "ws-test",
        transcriptId: created.id,
        todos: parsed.todos,
        idempotencyKey: committed.idempotencyKey,
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  const replay = (await replayRes.json()) as { auditEventId: string; committedTodos: number };
  assert.equal(replay.auditEventId, committed.auditEventId);
  assert.equal(replay.committedTodos, 1);

  const listRes = await listGet(
    new Request("http://localhost/api/transcripts?workspaceId=ws-test&limit=5"),
  );
  const listed = (await listRes.json()) as { transcripts: Array<{ id: string }> };
  assert.equal(listed.transcripts.length, 1);
  assert.equal(listed.transcripts[0]?.id, created.id);

  const detailRes = await detailGet(
    new Request(`http://localhost/api/transcripts/${created.id}?workspaceId=ws-test`),
    { params: Promise.resolve({ id: created.id }) },
  );
  const detail = (await detailRes.json()) as {
    transcript: { id: string };
    todos: Array<{ title: string }>;
  };
  assert.equal(detail.transcript.id, created.id);
  assert.equal(detail.todos.length, 1);
  assert.equal(detail.todos[0]?.title, "Task");
});
