import { NextResponse } from "next/server";
import { z } from "zod";

import { getPersistenceRepository } from "@/server/repositories";

const querySchema = z.object({
  workspaceId: z.string().min(1),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);

  const parsedQuery = querySchema.safeParse({
    workspaceId: searchParams.get("workspaceId"),
  });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const repository = getPersistenceRepository();
  const detail = await repository.getTranscriptDetail(parsedQuery.data.workspaceId, id);

  if (!detail) {
    return NextResponse.json({ error: "Transcript not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
