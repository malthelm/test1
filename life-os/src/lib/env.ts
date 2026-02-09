import { z } from "zod";

const sharedSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverSchema = sharedSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

export type ClientEnv = z.infer<typeof sharedSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

function readSharedEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function getClientEnv(): ClientEnv {
  return sharedSchema.parse(readSharedEnv());
}

export function getServerEnv(): ServerEnv {
  return serverSchema.parse({
    ...readSharedEnv(),
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
