import { NextResponse } from "next/server";
import { z } from "zod";

import { getPersistenceRepository } from "@/server/repositories";

const querySchema = z.object({
  workspaceId: z.string().min(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsedQuery = querySchema.safeParse({
    workspaceId: searchParams.get("workspaceId"),
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const repository = getPersistenceRepository();
  const transcripts = await repository.listTranscripts(
    parsedQuery.data.workspaceId,
    parsedQuery.data.limit,
  );

  return NextResponse.json({ transcripts });
}
