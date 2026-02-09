import { NextResponse } from "next/server";
import { z } from "zod";

import { getPersistenceRepository } from "@/server/repositories";
import { getRequestContext } from "@/server/request-context";

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).default(100),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const { workspaceId } = getRequestContext(req);
  const repository = getPersistenceRepository();
  const todos = await repository.listTodos(workspaceId, parsed.data.limit);

  return NextResponse.json({ todos });
}
