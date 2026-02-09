import { LocalPersistenceRepository, resetLocalDbForTests } from "@/server/repositories/local-repository";
import { type CommitTodosParams } from "@/server/repositories/types";

const localRepo = new LocalPersistenceRepository();

export async function createTranscript(workspaceId: string, rawText: string) {
  return localRepo.createTranscript(workspaceId, rawText);
}

export async function listTranscripts(workspaceId: string, limit?: number) {
  return localRepo.listTranscripts(workspaceId, limit);
}

export async function getTranscriptDetail(workspaceId: string, transcriptId: string) {
  return localRepo.getTranscriptDetail(workspaceId, transcriptId);
}

export async function getIdempotencyResult(key: string) {
  return localRepo.getIdempotencyResult(key);
}

export async function commitTodosAndAudit(params: CommitTodosParams) {
  return localRepo.commitTodosAndAudit(params);
}

export async function __resetLocalDbForTests() {
  await resetLocalDbForTests();
}
