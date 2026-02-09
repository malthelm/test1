import { NextResponse } from "next/server";
import { z } from "zod";

import { getPersistenceRepository } from "@/server/repositories";
import { getRequestContext } from "@/server/request-context";

const bodySchema = z.object({
  rawText: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsedBody = bodySchema.safeParse(json);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const repository = getPersistenceRepository();
  const { workspaceId } = getRequestContext(req);
  const transcript = await repository.createTranscript(workspaceId, parsedBody.data.rawText);

  return NextResponse.json(transcript);
}
