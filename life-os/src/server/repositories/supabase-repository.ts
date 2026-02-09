import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { type ParsedTodoLine } from "@/lib/transcripts/parser";
import {
  type CommitTodosParams,
  type DerivedCommitResult,
  type PersistenceRepository,
  type TranscriptDetail,
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

  async listTranscripts(workspaceId: string, limit = 20): Promise<TranscriptRecord[]> {
    const { data, error } = await this.supabase
      .from("transcripts")
      .select("id, workspace_id, raw_text, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      rawText: row.raw_text,
      createdAt: row.created_at,
    }));
  }

  async listTodos(workspaceId: string, limit = 50) {
    const { data, error } = await this.supabase
      .from("todos")
      .select(
        "id, workspace_id, transcript_id, title, horizon, energy, context, money_cost, domain, responsible, due_date, notes, created_at",
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      transcriptId: row.transcript_id,
      title: row.title,
      horizon: row.horizon,
      energy: row.energy,
      context: row.context,
      moneyCost: row.money_cost,
      domain: row.domain,
      responsible: row.responsible,
      dueDate: row.due_date,
      notes: row.notes,
      createdAt: row.created_at,
    }));
  }

  async getTranscriptDetail(workspaceId: string, transcriptId: string): Promise<TranscriptDetail | null> {
    const { data: transcript, error: transcriptError } = await this.supabase
      .from("transcripts")
      .select("id, workspace_id, raw_text, created_at")
      .eq("workspace_id", workspaceId)
      .eq("id", transcriptId)
      .maybeSingle();

    if (transcriptError) throw transcriptError;
    if (!transcript) return null;

    const { data: todos, error: todoError } = await this.supabase
      .from("todos")
      .select(
        "id, workspace_id, transcript_id, title, horizon, energy, context, money_cost, domain, responsible, due_date, notes, created_at",
      )
      .eq("workspace_id", workspaceId)
      .eq("transcript_id", transcriptId)
      .order("created_at", { ascending: true });

    if (todoError) throw todoError;

    return {
      transcript: {
        id: transcript.id,
        workspaceId: transcript.workspace_id,
        rawText: transcript.raw_text,
        createdAt: transcript.created_at,
      },
      todos: (todos ?? []).map((row) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        transcriptId: row.transcript_id,
        title: row.title,
        horizon: row.horizon,
        energy: row.energy,
        context: row.context,
        moneyCost: row.money_cost,
        domain: row.domain,
        responsible: row.responsible,
        dueDate: row.due_date,
        notes: row.notes,
        createdAt: row.created_at,
      })),
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
    const existing = await this.getIdempotencyResult(params.idempotencyKey);
    if (existing) return existing;

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

    const canonical = await this.getIdempotencyResult(params.idempotencyKey);
    if (canonical) return canonical;

    return {
      idempotencyKey: row.idempotency_key,
      committedTodos: row.committed_todos,
      skippedTodos: row.skipped_todos,
      auditEventId: row.audit_event_id,
    };
  }
}
