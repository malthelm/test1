-- Life OS MVP persistence baseline (Supabase/Postgres)

create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id text primary key,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  raw_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  transcript_id uuid not null references public.transcripts(id) on delete cascade,
  title text not null,
  horizon text not null,
  energy text not null,
  context text not null,
  money_cost text not null,
  domain text not null,
  responsible text not null,
  due_date text not null,
  notes text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.idempotency_keys (
  key text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  result_payload jsonb not null,
  created_at timestamptz not null default now()
);

create or replace function public.commit_derived_from_transcript(
  p_workspace_id text,
  p_transcript_id uuid,
  p_todos jsonb,
  p_idempotency_key text
)
returns table(
  idempotency_key text,
  committed_todos integer,
  skipped_todos integer,
  audit_event_id uuid
)
language plpgsql
security definer
as $$
declare
  existing_payload jsonb;
  created_count integer := 0;
  new_audit_id uuid;
begin
  select result_payload into existing_payload
  from public.idempotency_keys
  where key = p_idempotency_key;

  if existing_payload is not null then
    return query
    select
      p_idempotency_key,
      (existing_payload->>'committedTodos')::integer,
      coalesce((existing_payload->>'skippedTodos')::integer, 0),
      (existing_payload->>'auditEventId')::uuid;
    return;
  end if;

  insert into public.todos (
    workspace_id,
    transcript_id,
    title,
    horizon,
    energy,
    context,
    money_cost,
    domain,
    responsible,
    due_date,
    notes
  )
  select
    p_workspace_id,
    p_transcript_id,
    coalesce(todo->>'title', ''),
    coalesce(todo->>'horizon', ''),
    coalesce(todo->>'energy', ''),
    coalesce(todo->>'context', ''),
    coalesce(todo->>'money_cost', ''),
    coalesce(todo->>'domain', ''),
    coalesce(todo->>'responsible', ''),
    coalesce(todo->>'due_date', ''),
    coalesce(todo->>'notes', '')
  from jsonb_array_elements(coalesce(p_todos, '[]'::jsonb)) as todo;

  get diagnostics created_count = row_count;

  insert into public.audit_events (workspace_id, action, target_type, target_id, metadata)
  values (
    p_workspace_id,
    'commit_derived_from_transcript',
    'transcript',
    p_transcript_id,
    jsonb_build_object('committedTodos', created_count, 'idempotencyKey', p_idempotency_key)
  )
  returning id into new_audit_id;

  insert into public.idempotency_keys (key, workspace_id, result_payload)
  values (
    p_idempotency_key,
    p_workspace_id,
    jsonb_build_object(
      'idempotencyKey', p_idempotency_key,
      'committedTodos', created_count,
      'skippedTodos', 0,
      'auditEventId', new_audit_id
    )
  )
  on conflict (key) do nothing;

  return query
  select p_idempotency_key, created_count, 0, new_audit_id;
end;
$$;
