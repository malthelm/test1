import { NextResponse } from "next/server";
import { z } from "zod";

import { commitDerivedFromTranscript } from "@/server/derived-commit-service";

const todoSchema = z.object({
  raw: z.string(),
  fields: z.object({
    title: z.string(),
    horizon: z.string(),
    energy: z.string(),
    context: z.string(),
    moneyCost: z.string(),
    domain: z.string(),
    responsible: z.string(),
    dueDate: z.string(),
    notes: z.string(),
  }),
});

const bodySchema = z.object({
  workspaceId: z.string().min(1),
  transcriptId: z.string().min(1),
  todos: z.array(todoSchema),
  idempotencyKey: z.string().optional(),
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsedBody = bodySchema.safeParse(json);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await commitDerivedFromTranscript(parsedBody.data);
  return NextResponse.json(result);
}
