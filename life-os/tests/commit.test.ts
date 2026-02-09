import assert from "node:assert/strict";
import test from "node:test";

import { commitDerivedFromTranscript } from "@/server/derived-commit-service";
import { __resetLocalDbForTests } from "@/server/local-db";
import { __resetRepositoryForTests } from "@/server/repositories";

process.env.LIFE_OS_DB_FILE = "/tmp/life-os-test-db-commit.json";
process.env.LIFE_OS_PERSISTENCE = "local";

test("commit is idempotent for same payload", async () => {
  __resetRepositoryForTests();
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

test("explicit idempotency key wins over payload hash", async () => {
  __resetRepositoryForTests();
  await __resetLocalDbForTests();

  const idempotencyKey = "idem-123";

  const first = await commitDerivedFromTranscript({
    workspaceId: "ws-test",
    transcriptId: "tr-1",
    idempotencyKey,
    todos: [
      {
        raw: "Task A|later|low|online|none|ops|Malthe|2026-02-20|note",
        fields: {
          title: "Task A",
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
  });

  const second = await commitDerivedFromTranscript({
    workspaceId: "ws-test",
    transcriptId: "tr-1",
    idempotencyKey,
    todos: [
      {
        raw: "Task B|later|low|online|none|ops|Malthe|2026-02-20|note",
        fields: {
          title: "Task B",
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
  });

  assert.equal(first.idempotencyKey, idempotencyKey);
  assert.equal(second.idempotencyKey, idempotencyKey);
  assert.equal(first.auditEventId, second.auditEventId);
});
