import { NextResponse } from "next/server";

import { getPersistenceRepository } from "@/server/repositories";
import { getRequestContext } from "@/server/request-context";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const repository = getPersistenceRepository();
  const { workspaceId } = getRequestContext(req);
  const detail = await repository.getTranscriptDetail(workspaceId, id);

  if (!detail) {
    return NextResponse.json({ error: "Transcript not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
