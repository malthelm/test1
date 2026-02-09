import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  type AuditEvent,
  type CommitTodosParams,
  type DerivedCommitResult,
  type PersistenceRepository,
  type TodoRecord,
  type TranscriptRecord,
} from "@/server/repositories/types";

type LocalDb = {
  transcripts: TranscriptRecord[];
  todos: TodoRecord[];
  auditEvents: AuditEvent[];
  idempotency: Record<string, DerivedCommitResult>;
};

const EMPTY_DB: LocalDb = {
  transcripts: [],
  todos: [],
  auditEvents: [],
  idempotency: {},
};

function dbFilePath() {
  const custom = process.env.LIFE_OS_DB_FILE;
  return custom && custom.length > 0
    ? custom
    : path.join(process.cwd(), ".data", "local-db.json");
}

async function loadDb(): Promise<LocalDb> {
  const file = dbFilePath();
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as LocalDb;
  } catch {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(EMPTY_DB, null, 2));
    return { ...EMPTY_DB };
  }
}

async function saveDb(db: LocalDb) {
  const file = dbFilePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(db, null, 2));
}

export class LocalPersistenceRepository implements PersistenceRepository {
  async createTranscript(workspaceId: string, rawText: string) {
    const db = await loadDb();
    const record: TranscriptRecord = {
      id: crypto.randomUUID(),
      workspaceId,
      rawText,
      createdAt: new Date().toISOString(),
    };
    db.transcripts.push(record);
    await saveDb(db);
    return record;
  }

  async getIdempotencyResult(key: string) {
    const db = await loadDb();
    return db.idempotency[key] ?? null;
  }

  async commitTodosAndAudit(params: CommitTodosParams) {
    const db = await loadDb();

    const existing = db.idempotency[params.idempotencyKey];
    if (existing) return existing;

    const createdAt = new Date().toISOString();
    const todoRecords: TodoRecord[] = params.todos.map((t) => ({
      id: crypto.randomUUID(),
      workspaceId: params.workspaceId,
      transcriptId: params.transcriptId,
      title: t.fields.title,
      horizon: t.fields.horizon,
      energy: t.fields.energy,
      context: t.fields.context,
      moneyCost: t.fields.moneyCost,
      domain: t.fields.domain,
      responsible: t.fields.responsible,
      dueDate: t.fields.dueDate,
      notes: t.fields.notes,
      createdAt,
    }));

    db.todos.push(...todoRecords);

    const audit: AuditEvent = {
      id: crypto.randomUUID(),
      workspaceId: params.workspaceId,
      action: "commit_derived_from_transcript",
      targetType: "transcript",
      targetId: params.transcriptId,
      metadata: {
        committedTodos: todoRecords.length,
        idempotencyKey: params.idempotencyKey,
      },
      createdAt,
    };

    db.auditEvents.push(audit);

    const result: DerivedCommitResult = {
      idempotencyKey: params.idempotencyKey,
      committedTodos: todoRecords.length,
      skippedTodos: 0,
      auditEventId: audit.id,
    };

    db.idempotency[params.idempotencyKey] = result;
    await saveDb(db);
    return result;
  }
}

export async function resetLocalDbForTests() {
  await saveDb({ ...EMPTY_DB });
}
