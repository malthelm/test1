"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ParseResponse = {
  todos: Array<{ raw: string; fields: { title: string } }>;
  issues: Array<{ code: string; message: string; line: number }>;
  confidence: { score: number; globalCritical: boolean };
};

const exampleDraft = `[SUMMARY]\nWeekly planning sync\n[TIMELINE]\nTomorrow 10:00 budget review\n[TODOS]\nBook dentist|later|low|online|none|health|Malthe|2026-02-20|check slots\n[DECISIONS]\nKeep web MVP scope\n[MONEY]\nNo spend this week\n[IDEAS]\nAdd transcript templates\n[QUESTIONS]\nShould we add recurring chores now?`;

export default function NewTranscriptPage() {
  const [draft, setDraft] = useState(exampleDraft);
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function onParse() {
    setLoading(true);
    const res = await fetch("/api/transcripts/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft }),
    });
    const json = (await res.json()) as ParseResponse;
    setResult(json);
    setLoading(false);
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
          <Button onClick={onParse} disabled={loading}>
            {loading ? "Parsing..." : "Parse Draft"}
          </Button>
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
