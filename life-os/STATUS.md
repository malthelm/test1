# Life OS MVP – Progress Status

## Shipped in this run (2026-02-09)

### 1) Transcript persistence/retrieval + review/commit UX improvements

- Extended persistence contract with retrieval flows:
  - `listTranscripts(workspaceId, limit)`
  - `getTranscriptDetail(workspaceId, transcriptId)`
- Implemented retrieval in both backends:
  - `LocalPersistenceRepository`
  - `SupabasePersistenceRepository`
- Added transcript retrieval APIs:
  - `GET /api/transcripts?workspaceId=...&limit=...`
  - `GET /api/transcripts/[id]?workspaceId=...`
- Improved `/transcripts/new` UX:
  - Save + parse flow is explicit
  - Recent transcript list in right rail
  - Click-to-load persisted transcript and prior committed TODO count
  - Better commit feedback and simple error surfacing

### 2) Phase 1 security foundations (membership model + RLS-oriented scaffolding)

- Added migration: `supabase/migrations/20260209140000_phase1_security_foundations.sql`
  - `workspace_memberships` table with role enum check (`owner/member/viewer`)
  - helper functions:
    - `current_user_id()`
    - `current_workspace_id()`
    - `user_has_workspace_access(workspace_id)`
  - enabled RLS on core tables and membership table
  - initial membership-oriented read policies scaffolded across workspace-scoped tables
- Added initial migration test scaffold:
  - `tests/migrations.test.ts` validates presence of membership + RLS policy scaffolding
- Added SQL test placeholder structure:
  - `supabase/tests/rls/README.md`

### 3) CI migration checks tightened (Supabase folder structure placeholders)

- Added npm scripts:
  - `migration:structure-check`
  - `migration:rls-placeholder-check`
- Updated workflow `.github/workflows/life-os-ci.yml` to run:
  - lint / typecheck / build / test
  - `migration:check`
  - `migration:structure-check`
  - `migration:rls-placeholder-check`

## Validation

- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run build` ✅
- `npm run test` ✅

## Next steps

1. Replace placeholder RLS checks with executable pgTAP (or SQL) tests under `supabase/tests/rls` and wire them into CI once Supabase CLI test harness is configured.
2. Add write/update/delete policies for memberships, transcripts, todos, audit events and enforce role-specific permissions.
3. Add transcript detail page route (`/transcripts/[id]`) and richer review UI (field-level TODO diff/edit before commit).
4. Introduce workspace/user auth context plumbing so `workspaceId` stops being client-supplied in MVP routes.
