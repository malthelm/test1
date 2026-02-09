import { LocalPersistenceRepository } from "@/server/repositories/local-repository";
import { SupabasePersistenceRepository } from "@/server/repositories/supabase-repository";
import { type PersistenceRepository } from "@/server/repositories/types";

function shouldUseSupabase() {
  if (process.env.LIFE_OS_PERSISTENCE === "local") return false;
  if (process.env.LIFE_OS_PERSISTENCE === "supabase") return true;

  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let singleton: PersistenceRepository | null = null;

export function getPersistenceRepository(): PersistenceRepository {
  if (singleton) return singleton;

  if (shouldUseSupabase()) {
    try {
      singleton = new SupabasePersistenceRepository();
      return singleton;
    } catch {
      // Fallback to local repository for local dev convenience.
    }
  }

  singleton = new LocalPersistenceRepository();
  return singleton;
}

export function __resetRepositoryForTests() {
  singleton = null;
}
