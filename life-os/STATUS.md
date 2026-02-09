# Life OS MVP – Progress Status

## Shipped in this run (2026-02-09)

### 0) Role-based write policy hardening (owner/member/viewer)

- Added migration:
  - `supabase/migrations/20260209163000_phase1_role_based_write_policies.sql`
- Introduced role helper functions for deterministic policy comparisons:
  - `public.workspace_role_rank(role text)`
  - `public.user_has_workspace_role_at_least(workspace_id text, min_role text)`
- Replaced permissive insert-only write scaffold with role-aware policy definitions across core tables:
  - `workspaces`: owner insert/update/delete gates
  - `workspace_memberships`: owner insert/update/delete gates
  - `transcripts`: member insert/update, owner delete
  - `todos`: member insert/update, owner delete
  - `audit_events`: member insert (append-only)
  - `idempotency_keys`: member insert (append-only)
- Expanded migration tests (`tests/migrations.test.ts`) with assertions for:
  - new role helper functions
  - update/delete policy coverage for transcripts/todos/memberships

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
2. Add executable Supabase/pgTAP RLS tests for owner/member/viewer allow+deny cases using seeded fixtures.
3. Add TODO edit/diff controls in review UI before commit (field-level correction loop).
4. Move workspace/user context to auth claims/session server-side and remove client-supplied workspace ID for protected routes.
