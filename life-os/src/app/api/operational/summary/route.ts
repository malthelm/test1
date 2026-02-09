import { NextResponse } from "next/server";

import { getPersistenceRepository } from "@/server/repositories";
import { getRequestContext } from "@/server/request-context";

export async function GET(req: Request) {
  const { workspaceId } = getRequestContext(req);
  const repository = getPersistenceRepository();

  const [transcripts, todos] = await Promise.all([
    repository.listTranscripts(workspaceId, 200),
    repository.listTodos(workspaceId, 500),
  ]);

  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const dueThisWeek = todos.filter((todo) => {
    const due = new Date(todo.dueDate).getTime();
    return Number.isFinite(due) && due >= now && due <= now + weekMs;
  }).length;

  const createdLast7d = todos.filter((todo) => {
    const created = new Date(todo.createdAt).getTime();
    return Number.isFinite(created) && created >= now - weekMs;
  }).length;

  return NextResponse.json({
    workspaceId,
    openTodos: todos.length,
    transcriptsProcessed: transcripts.length,
    dueThisWeek,
    createdLast7d,
  });
}
