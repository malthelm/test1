import assert from "node:assert/strict";
import test from "node:test";

import { parseDraft } from "@/lib/transcripts/parser";

test("parser flags malformed TODO pipes and still returns valid lines", () => {
  const input = `[SUMMARY]\nA\n[TIMELINE]\nB\n[TODOS]\nGood task|later|low|online|none|ops|Malthe|2026-02-20|note\nBad task|later|low\n[DECISIONS]\nC\n[MONEY]\nD\n[IDEAS]\nE\n[QUESTIONS]\nF`;

  const parsed = parseDraft(input);
  assert.equal(parsed.todos.length, 1);
  assert.equal(parsed.todos[0]?.fields.title, "Good task");
  assert.equal(parsed.issues.some((i) => i.code === "TODO_FIELD_COUNT"), true);
});
