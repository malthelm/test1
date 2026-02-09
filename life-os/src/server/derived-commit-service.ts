import crypto from "node:crypto";

import { type ParsedTodoLine } from "@/lib/transcripts/parser";
import { getPersistenceRepository } from "@/server/repositories";
import { type DerivedCommitResult } from "@/server/repositories/types";

export type CommitRequest = {
  workspaceId: string;
  transcriptId: string;
  todos: ParsedTodoLine[];
  idempotencyKey?: string;
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

  const repository = getPersistenceRepository();
  return repository.commitTodosAndAudit({
    workspaceId: req.workspaceId,
    transcriptId: req.transcriptId,
    todos: req.todos,
    idempotencyKey,
  });
}
