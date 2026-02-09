"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { workspaceFetch } from "@/components/workspace-fetch";

type Todo = {
  id: string;
  title: string;
  dueDate: string;
  responsible: string;
  domain: string;
  horizon: string;
};

const BOARD_COLUMNS = ["now", "next", "later", "someday"] as const;

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    void workspaceFetch("/api/todos?limit=200")
      .then((res) => res.json() as Promise<{ todos: Todo[] }> )
      .then((json) => setTodos(json.todos ?? []));
  }, []);

  const grouped = BOARD_COLUMNS.map((col) => ({
    column: col,
    todos: todos.filter((todo) => (todo.horizon || "later").toLowerCase() === col),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Todos Board ({todos.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {grouped.map(({ column, todos: columnTodos }) => (
            <section key={column} className="rounded border p-3">
              <h3 className="mb-2 text-sm font-semibold uppercase text-neutral-700">
                {column} ({columnTodos.length})
              </h3>
              <ul className="space-y-2 text-sm">
                {columnTodos.map((todo) => (
                  <li key={todo.id} className="rounded border p-2">
                    <div className="font-medium">{todo.title}</div>
                    <div className="text-neutral-600">
                      Due: {todo.dueDate || "—"} · Owner: {todo.responsible || "—"} · Domain: {todo.domain || "—"}
                    </div>
                  </li>
                ))}
                {columnTodos.length === 0 && <li className="text-neutral-500">No items</li>}
              </ul>
            </section>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
