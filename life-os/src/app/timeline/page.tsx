"use client";

import { useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { workspaceFetch } from "@/components/workspace-fetch";

type Todo = { id: string; title: string; dueDate: string; responsible: string };

export default function TimelinePage() {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    void workspaceFetch("/api/todos?limit=300")
      .then((res) => res.json() as Promise<{ todos: Todo[] }> )
      .then((json) => setTodos(json.todos ?? []));
  }, []);

  const ordered = useMemo(
    () =>
      [...todos]
        .filter((t) => t.dueDate)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [todos],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline (by due date)</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {ordered.map((todo) => (
            <li key={todo.id} className="rounded border p-2">
              <span className="font-mono text-xs text-neutral-600">{todo.dueDate}</span>
              <div className="font-medium">{todo.title}</div>
              <div className="text-neutral-600">Owner: {todo.responsible || "—"}</div>
            </li>
          ))}
          {ordered.length === 0 && <li className="text-neutral-600">No dated todos yet.</li>}
        </ul>
      </CardContent>
    </Card>
  );
}
