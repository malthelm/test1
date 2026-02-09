import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { type ParsedTodoLine } from "@/lib/transcripts/parser";
import {
  type CommitTodosParams,
  type DerivedCommitResult,
  type PersistenceRepository,
  type TranscriptRecord,
} from "@/server/repositories/types";

type CommitRpcResponse = {
  idempotency_key: string;
  committed_todos: number;
  skipped_todos: number;
  audit_event_id: string;
};

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase persistence requested but env is incomplete");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

function mapTodoPayload(todos: ParsedTodoLine[]) {
  return todos.map((todo) => ({
    title: todo.fields.title,
    horizon: todo.fields.horizon,
    energy: todo.fields.energy,
    context: todo.fields.context,
    money_cost: todo.fields.moneyCost,
    domain: todo.fields.domain,
    responsible: todo.fields.responsible,
    due_date: todo.fields.dueDate,
    notes: todo.fields.notes,
    raw: todo.raw,
  }));
}

export class SupabasePersistenceRepository implements PersistenceRepository {
  constructor(private readonly supabase: SupabaseClient = createSupabaseAdminClient()) {}

  async createTranscript(workspaceId: string, rawText: string): Promise<TranscriptRecord> {
    const { error: workspaceError } = await this.supabase
      .from("workspaces")
      .upsert({ id: workspaceId, title: workspaceId }, { onConflict: "id" });

    if (workspaceError) throw workspaceError;

    const { data, error } = await this.supabase
      .from("transcripts")
      .insert({ workspace_id: workspaceId, raw_text: rawText })
      .select("id, workspace_id, raw_text, created_at")
      .single();

    if (error) throw error;

    return {
      id: data.id,
      workspaceId: data.workspace_id,
      rawText: data.raw_text,
      createdAt: data.created_at,
    };
  }

  async getIdempotencyResult(key: string): Promise<DerivedCommitResult | null> {
    const { data, error } = await this.supabase
      .from("idempotency_keys")
      .select("key, result_payload")
      .eq("key", key)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return data.result_payload as DerivedCommitResult;
  }

  async commitTodosAndAudit(params: CommitTodosParams): Promise<DerivedCommitResult> {
    const { data, error } = await this.supabase.rpc("commit_derived_from_transcript", {
      p_workspace_id: params.workspaceId,
      p_transcript_id: params.transcriptId,
      p_todos: mapTodoPayload(params.todos),
      p_idempotency_key: params.idempotencyKey,
    });

    if (error) throw error;

    const row = (Array.isArray(data) ? data[0] : data) as CommitRpcResponse | null;
    if (!row) {
      throw new Error("commit_derived_from_transcript returned no data");
    }

    return {
      idempotencyKey: row.idempotency_key,
      committedTodos: row.committed_todos,
      skippedTodos: row.skipped_todos,
      auditEventId: row.audit_event_id,
    };
  }
}
