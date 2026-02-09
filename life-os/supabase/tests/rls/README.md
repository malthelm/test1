# Supabase RLS test scaffolding

This directory is the placeholder for pgTAP/sql-based RLS checks in Phase 1.

Planned test groups:
- membership visibility
- workspace isolation
- transcript/todo row access
- idempotency key workspace isolation

Starter artifacts:
- `policy-matrix-starter.json` defines expected read/write roles per table.
- `tests/migrations.test.ts` validates matrix/table coverage and policy/function markers.
