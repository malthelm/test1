import { NextResponse } from "next/server";
import { z } from "zod";

import { getPersistenceRepository } from "@/server/repositories";
import { getRequestContext } from "@/server/request-context";

const querySchema = z.object({
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limit: z.coerce.number().int().positive().max(1000).default(500),
});

function toIsoDateUtc(date: Date) {
  return date.toISOString().slice(0, 10);
}

function mondayOfWeekUtc(now: Date) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function parseWeekStartUtc(weekStart: string) {
  const d = new Date(`${weekStart}T00:00:00.000Z`);

  if (Number.isNaN(d.getTime()) || toIsoDateUtc(d) !== weekStart) {
    return { error: "weekStart must be a valid ISO date (YYYY-MM-DD)" as const };
  }

  if (d.getUTCDay() !== 1) {
    return { error: "weekStart must be a Monday" as const };
  }

  return { value: d };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    weekStart: searchParams.get("weekStart") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const requestedWeekStart = parsed.data.weekStart ?? toIsoDateUtc(mondayOfWeekUtc(new Date()));
  const weekStartParsed = parseWeekStartUtc(requestedWeekStart);
  if ("error" in weekStartParsed) {
    return NextResponse.json({ error: weekStartParsed.error }, { status: 400 });
  }

  const start = weekStartParsed.value;
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);

  const { workspaceId } = getRequestContext(req);
  const repository = getPersistenceRepository();
  const todos = await repository.listTodos(workspaceId, parsed.data.limit);

  const weekTodos = todos.filter((todo) => {
    const due = new Date(todo.dueDate).getTime();
    return Number.isFinite(due) && due >= start.getTime() && due < end.getTime();
  });

  return NextResponse.json({
    workspaceId,
    weekStart: toIsoDateUtc(start),
    weekEndExclusive: toIsoDateUtc(end),
    todos: weekTodos,
  });
}
