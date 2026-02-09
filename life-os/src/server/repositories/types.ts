import { type ParsedTodoLine } from "@/lib/transcripts/parser";

export type TranscriptRecord = {
  id: string;
  workspaceId: string;
  rawText: string;
  createdAt: string;
};

export type TodoRecord = {
  id: string;
  workspaceId: string;
  transcriptId: string;
  title: string;
  horizon: string;
  energy: string;
  context: string;
  moneyCost: string;
  domain: string;
  responsible: string;
  dueDate: string;
  notes: string;
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  workspaceId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type DerivedCommitResult = {
  idempotencyKey: string;
  committedTodos: number;
  skippedTodos: number;
  auditEventId: string;
};

export type CommitTodosParams = {
  workspaceId: string;
  transcriptId: string;
  todos: ParsedTodoLine[];
  idempotencyKey: string;
};

export type TranscriptDetail = {
  transcript: TranscriptRecord;
  todos: TodoRecord[];
};

export interface PersistenceRepository {
  createTranscript(workspaceId: string, rawText: string): Promise<TranscriptRecord>;
  listTranscripts(workspaceId: string, limit?: number): Promise<TranscriptRecord[]>;
  listTodos(workspaceId: string, limit?: number): Promise<TodoRecord[]>;
  getTranscriptDetail(workspaceId: string, transcriptId: string): Promise<TranscriptDetail | null>;
  getIdempotencyResult(key: string): Promise<DerivedCommitResult | null>;
  commitTodosAndAudit(params: CommitTodosParams): Promise<DerivedCommitResult>;
}
