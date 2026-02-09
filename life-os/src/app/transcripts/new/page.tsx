"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { workspaceFetch } from "@/components/workspace-fetch";

type TodoLine = {
  raw: string;
  fields: {
    title: string;
    horizon: string;
    energy: string;
    context: string;
    moneyCost: string;
    domain: string;
    responsible: string;
    dueDate: string;
    notes: string;
  };
};

type ParseResponse = {
  todos: TodoLine[];
  issues: Array<{ code: string; message: string; line: number }>;
  confidence: { score: number; globalCritical: boolean };
};

type TranscriptRecord = {
  id: string;
  rawText: string;
  createdAt: string;
};

const exampleDraft = `[SUMMARY]\nWeekly planning sync\n[TIMELINE]\nTomorrow 10:00 budget review\n[TODOS]\nBook dentist|later|low|online|none|health|Malthe|2026-02-20|check slots\n[DECISIONS]\nKeep web MVP scope\n[MONEY]\nNo spend this week\n[IDEAS]\nAdd transcript templates\n[QUESTIONS]\nShould we add recurring chores now?`;

export default function NewTranscriptPage() {
  const [draft, setDraft] = useState(exampleDraft);
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [savedTodosCount, setSavedTodosCount] = useState(0);
  const [recent, setRecent] = useState<TranscriptRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [commitResult, setCommitResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshRecent() {
    const res = await workspaceFetch(`/api/transcripts?limit=8`);
    const json = (await res.json()) as { transcripts: TranscriptRecord[] };
    setRecent(json.transcripts ?? []);
  }

  useEffect(() => {
    void refreshRecent();
  }, []);

  async function createTranscriptIfNeeded() {
    if (transcriptId) return transcriptId;

    const created = await workspaceFetch("/api/transcripts/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawText: draft,
      }),
    });

    if (!created.ok) throw new Error("Failed to save transcript draft");

    const transcript = (await created.json()) as { id: string };
    setTranscriptId(transcript.id);
    return transcript.id;
  }

  async function onParse() {
    setLoading(true);
    setError(null);

    try {
      await createTranscriptIfNeeded();

      const res = await fetch("/api/transcripts/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      });

      if (!res.ok) throw new Error("Failed to parse transcript");

      const json = (await res.json()) as ParseResponse;
      setResult(json);
      setCommitResult(null);
      await refreshRecent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function onLoadTranscript(id: string) {
    setLoading(true);
    setError(null);

    try {
      const res = await workspaceFetch(`/api/transcripts/${id}`);
      if (!res.ok) throw new Error("Failed to load transcript");

      const json = (await res.json()) as {
        transcript: TranscriptRecord;
        todos: Array<{ id: string }>;
      };

      setTranscriptId(json.transcript.id);
      setDraft(json.transcript.rawText);
      setSavedTodosCount(json.todos.length);
      setCommitResult(
        json.todos.length > 0 ? `Already committed ${json.todos.length} TODO(s).` : null,
      );
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function onCommitTodos() {
    if (!result || !transcriptId) return;

    setError(null);

    const res = await workspaceFetch("/api/transcripts/commit-derived", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcriptId,
        todos: result.todos,
      }),
    });

    if (!res.ok) {
      setError("Failed to commit TODOs");
      return;
    }

    const json = (await res.json()) as {
      committedTodos: number;
      idempotencyKey: string;
    };

    setSavedTodosCount((prev) => Math.max(prev, json.committedTodos));
    setCommitResult(
      `Committed ${json.committedTodos} TODO(s) · idempotency ${json.idempotencyKey.slice(0, 12)}…`,
    );
    await refreshRecent();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">New Transcript</h1>
          <p className="text-sm text-neutral-600">Parse, review, commit, and reload prior transcripts.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Draft Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              className="min-h-[260px] w-full rounded-md border p-3 font-mono text-sm"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={onParse} disabled={loading}>
                {loading ? "Working..." : "Save + Parse Draft"}
              </Button>
              <Button
                variant="outline"
                onClick={onCommitTodos}
                disabled={!result || result.todos.length === 0 || result.confidence.globalCritical || !transcriptId}
              >
                Commit valid TODOs
              </Button>
            </div>
            {transcriptId && (
              <p className="text-xs text-neutral-600">
                Transcript ID: {transcriptId} · persisted todos: {savedTodosCount}
              </p>
            )}
            {commitResult && <p className="text-xs text-green-700">{commitResult}</p>}
            {error && <p className="text-xs text-red-700">{error}</p>}
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>
                Review · Score {result.confidence.score}
                {result.confidence.globalCritical ? " (blocked)" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-neutral-600">
                Commit readiness: {result.confidence.globalCritical ? "Blocked due to critical parser issues" : "Ready"}
              </p>
              <div>
                <h3 className="font-medium">Parsed TODOs ({result.todos.length})</h3>
                {result.todos.length === 0 ? (
                  <p className="mt-2 text-sm text-neutral-600">No TODO lines parsed from this draft.</p>
                ) : (
                  <div className="mt-2 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-2 py-1">Title</th>
                          <th className="px-2 py-1">Due</th>
                          <th className="px-2 py-1">Owner</th>
                          <th className="px-2 py-1">Domain</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.todos.map((t, i) => (
                          <tr key={`${t.fields.title}-${i}`} className="border-b last:border-0">
                            <td className="px-2 py-1">{t.fields.title}</td>
                            <td className="px-2 py-1">{t.fields.dueDate}</td>
                            <td className="px-2 py-1">{t.fields.responsible}</td>
                            <td className="px-2 py-1">{t.fields.domain}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-medium">Issues ({result.issues.length})</h3>
                {result.issues.length === 0 ? (
                  <p className="mt-2 text-sm text-green-700">No parser issues detected.</p>
                ) : (
                  <ul className="mt-2 list-disc pl-5 text-sm">
                    {result.issues.map((issue, i) => (
                      <li key={`${issue.code}-${i}`}>
                        [{issue.code}] line {issue.line}: {issue.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent transcripts</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-neutral-600">No saved transcripts yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recent.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="w-full rounded border px-2 py-1 text-left hover:bg-neutral-100"
                    onClick={() => void onLoadTranscript(item.id)}
                  >
                    <div className="font-mono text-xs">{item.id.slice(0, 10)}…</div>
                    <div className="text-xs text-neutral-600">
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
