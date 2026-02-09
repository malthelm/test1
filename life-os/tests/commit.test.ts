import assert from "node:assert/strict";
import test from "node:test";

import { commitDerivedFromTranscript } from "@/server/derived-commit-service";
import { __resetLocalDbForTests } from "@/server/local-db";

process.env.LIFE_OS_DB_FILE = "/tmp/life-os-test-db-commit.json";

test("commit is idempotent for same payload", async () => {
  await __resetLocalDbForTests();

  const req = {
    workspaceId: "ws-test",
    transcriptId: "tr-1",
    todos: [
      {
        raw: "Task|later|low|online|none|ops|Malthe|2026-02-20|note",
        fields: {
          title: "Task",
          horizon: "later",
          energy: "low",
          context: "online",
          moneyCost: "none",
          domain: "ops",
          responsible: "Malthe",
          dueDate: "2026-02-20",
          notes: "note",
        },
      },
    ],
  };

  const first = await commitDerivedFromTranscript(req);
  const second = await commitDerivedFromTranscript(req);

  assert.equal(first.idempotencyKey, second.idempotencyKey);
  assert.equal(first.auditEventId, second.auditEventId);
  assert.equal(second.committedTodos, 1);
});
