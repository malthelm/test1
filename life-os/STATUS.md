# Life OS MVP – Progress Status

## Shipped in this run (2026-02-09)

### 1) RLS policy scaffolding expanded + migration test/matrix starter

- Added follow-up migration:
  - `supabase/migrations/20260209161000_phase1_rls_and_commit_function_hardening.sql`
- Expanded policy scaffolding to include initial write-path coverage:
  - `transcripts_member_insert`
  - `todos_member_insert`
  - `idempotency_member_insert`
  - `memberships_owner_insert` (scaffold; role tightening still pending)
- Added concrete migration tests in `tests/migrations.test.ts` for:
  - Phase 1 foundation markers (membership model, helper functions, RLS enablement)
  - Follow-up hardening markers (commit RPC conflict behavior + insert policy scaffold)
  - RLS matrix table coverage for all workspace-scoped core tables
- Added matrix starter artifact:
  - `supabase/tests/rls/policy-matrix-starter.json`
- Updated `supabase/tests/rls/README.md` with matrix/test linkage.

### 2) Commit-derived path moved closer to DB-first behavior (Supabase)

- Updated `SupabasePersistenceRepository.commitTodosAndAudit()`:
  - pre-check idempotency key via `getIdempotencyResult()` before RPC
  - call `commit_derived_from_transcript` RPC
  - post-read canonical idempotency payload and return canonical persisted result when present
- Hardened SQL function behavior in follow-up migration:
  - conflict path now returns canonical persisted payload from `idempotency_keys`
  - improves deterministic response shape under race/retry conditions
  - keeps audit/idempotency result alignment more stable from API caller perspective

### 3) Transcript review UX improvements

- Improved `/transcripts/new` review panel:
  - explicit commit readiness status (Ready vs blocked)
  - parsed TODOs now render as quick review table (title, due date, owner, domain)
  - empty-state messages for zero TODOs and zero parser issues
  - commit button disabled when parsed TODO list is empty

## Validation

- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run build` ✅
- `npm run test` ✅

## Next steps

1. Replace marker-based migration assertions with executable Supabase/pgTAP RLS tests, seeded by `policy-matrix-starter.json`.
2. Tighten write policies by role (owner/member/viewer) and add update/delete policy definitions per table.
3. Add TODO edit/diff controls in review UI before commit (field-level correction loop).
4. Move workspace/user context to auth claims/session server-side and remove client-supplied workspace ID for protected routes.
