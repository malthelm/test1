import { NextResponse } from "next/server";
import { z } from "zod";

import { parseDraft } from "@/lib/transcripts/parser";

const bodySchema = z.object({
  draft: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsedBody = bodySchema.safeParse(json);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = parseDraft(parsedBody.data.draft);
  return NextResponse.json(result);
}
