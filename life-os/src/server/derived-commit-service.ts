import crypto from "node:crypto";

import { type ParsedTodoLine } from "@/lib/transcripts/parser";
import { commitTodosAndAudit } from "@/server/local-db";

export type CommitRequest = {
  workspaceId: string;
  transcriptId: string;
  todos: ParsedTodoLine[];
  idempotencyKey?: string;
};

export type DerivedCommitResult = {
  idempotencyKey: string;
  committedTodos: number;
  skippedTodos: number;
  auditEventId: string;
};

export async function commitDerivedFromTranscript(
  req: CommitRequest,
): Promise<DerivedCommitResult> {
  const idempotencyKey =
    req.idempotencyKey ??
    crypto
      .createHash("sha256")
      .update(`${req.workspaceId}:${req.transcriptId}:${JSON.stringify(req.todos)}`)
      .digest("hex");

  return commitTodosAndAudit({
    workspaceId: req.workspaceId,
    transcriptId: req.transcriptId,
    todos: req.todos,
    idempotencyKey,
  });
}
