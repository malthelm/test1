# Life OS MVP – Progress Status

## Shipped in this run (2026-02-09)

- Added **persistence repository abstraction** (`PersistenceRepository`) with runtime selection:
  - `LocalPersistenceRepository` (JSON fallback for local dev/tests)
  - `SupabasePersistenceRepository` (DB-backed path)
- Wired API/service flow to repository layer:
  - `POST /api/transcripts/create` now writes through repository
  - `commitDerivedFromTranscript` now commits through repository
- Added **Supabase migration scaffolding** in `supabase/migrations/20260209133000_init_life_os.sql` for:
  - `workspaces`
  - `transcripts`
  - `todos`
  - `audit_events`
  - `idempotency_keys`
  - plus RPC function `commit_derived_from_transcript(...)` for atomic-ish commit/idempotency behavior
- Kept local-dev compatibility by preserving `local-db.ts` as a shim over the local repository.
- Improved tests for idempotency and transcript flow:
  - explicit idempotency key behavior test
  - replay of commit route with same idempotency key returns same audit result
- Hardened env handling to parse lazily via `getClientEnv()` / `getServerEnv()`.
- Replaced placeholder migration check script with real SQL migration presence check.

## Validation

- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run build` ✅
- `npm run test` ✅

## Notes

- Supabase path is enabled when `LIFE_OS_PERSISTENCE=supabase` or when required Supabase env vars are present; otherwise it falls back to local JSON.
