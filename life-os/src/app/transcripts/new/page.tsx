"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const exampleDraft = `[SUMMARY]\nWeekly planning sync\n[TIMELINE]\nTomorrow 10:00 budget review\n[TODOS]\nBook dentist|later|low|online|none|health|Malthe|2026-02-20|check slots\n[DECISIONS]\nKeep web MVP scope\n[MONEY]\nNo spend this week\n[IDEAS]\nAdd transcript templates\n[QUESTIONS]\nShould we add recurring chores now?`;

export default function NewTranscriptPage() {
  const [draft, setDraft] = useState(exampleDraft);
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [commitResult, setCommitResult] = useState<string | null>(null);

  async function onParse() {
    setLoading(true);

    if (!transcriptId) {
      const created = await fetch("/api/transcripts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws-demo",
          rawText: draft,
        }),
      });
      const transcript = (await created.json()) as { id: string };
      setTranscriptId(transcript.id);
    }

    const res = await fetch("/api/transcripts/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft }),
    });
    const json = (await res.json()) as ParseResponse;
    setResult(json);
    setLoading(false);
  }

  async function onCommitTodos() {
    if (!result || !transcriptId) return;

    const res = await fetch("/api/transcripts/commit-derived", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: "ws-demo",
        transcriptId,
        todos: result.todos,
      }),
    });

    const json = (await res.json()) as {
      committedTodos: number;
      idempotencyKey: string;
    };

    setCommitResult(
      `Committed ${json.committedTodos} todos (idempotency: ${json.idempotencyKey.slice(0, 8)}...)`,
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Transcript</h1>
        <p className="text-sm text-neutral-600">Phase 0.5 parser + review scaffold.</p>
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
              {loading ? "Parsing..." : "Parse Draft"}
            </Button>
            <Button
              variant="outline"
              onClick={onCommitTodos}
              disabled={!result || result.confidence.globalCritical || !transcriptId}
            >
              Commit valid TODOs
            </Button>
          </div>
          {transcriptId && (
            <p className="text-xs text-neutral-600">Transcript ID: {transcriptId}</p>
          )}
          {commitResult && <p className="text-xs text-green-700">{commitResult}</p>}
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
            <div>
              <h3 className="font-medium">Parsed TODOs ({result.todos.length})</h3>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {result.todos.map((t, i) => (
                  <li key={`${t.fields.title}-${i}`}>{t.fields.title}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium">Issues ({result.issues.length})</h3>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {result.issues.map((issue, i) => (
                  <li key={`${issue.code}-${i}`}>
                    [{issue.code}] line {issue.line}: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
