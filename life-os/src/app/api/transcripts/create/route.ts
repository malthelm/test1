import { NextResponse } from "next/server";
import { z } from "zod";

import { createTranscript } from "@/server/local-db";

const bodySchema = z.object({
  workspaceId: z.string().min(1),
  rawText: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsedBody = bodySchema.safeParse(json);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const transcript = await createTranscript(parsedBody.data.workspaceId, parsedBody.data.rawText);
  return NextResponse.json(transcript);
}
