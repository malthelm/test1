"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { workspaceFetch } from "@/components/workspace-fetch";

type Todo = { id: string; title: string; dueDate: string; domain: string };

type WeeklyPlanResponse = {
  weekStart: string;
  todos: Todo[];
};

function mondayOfWeekIsoUtc(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default function WeeklyPlanPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [weekStart, setWeekStart] = useState<string>(mondayOfWeekIsoUtc());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const start = mondayOfWeekIsoUtc();

    void workspaceFetch(`/api/weekly-plan?weekStart=${start}&limit=300`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Failed to load weekly plan");
        }
        return res.json() as Promise<WeeklyPlanResponse>;
      })
      .then((json) => {
        setTodos(json.todos ?? []);
        setWeekStart(json.weekStart ?? start);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load weekly plan");
      });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Plan ({todos.length})</CardTitle>
        <p className="text-sm text-neutral-600">Week of {weekStart} (Monday start validation enabled)</p>
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <ul className="space-y-2 text-sm">
          {todos.map((todo) => (
            <li key={todo.id} className="rounded border p-2">
              <div className="font-medium">{todo.title}</div>
              <div className="text-neutral-600">{todo.dueDate} · {todo.domain || "general"}</div>
            </li>
          ))}
          {todos.length === 0 && !error && <li className="text-neutral-600">No todos due this week.</li>}
        </ul>
      </CardContent>
    </Card>
  );
}
