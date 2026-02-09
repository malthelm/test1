-- Phase 1 follow-up: commit RPC idempotency/audit consistency + write policy scaffolding

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
  final_payload jsonb;
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
    jsonb_build_object('committedTodos', created_count, 'skippedTodos', 0, 'idempotencyKey', p_idempotency_key)
  )
  returning id into new_audit_id;

  final_payload := jsonb_build_object(
    'idempotencyKey', p_idempotency_key,
    'committedTodos', created_count,
    'skippedTodos', 0,
    'auditEventId', new_audit_id
  );

  insert into public.idempotency_keys (key, workspace_id, result_payload)
  values (p_idempotency_key, p_workspace_id, final_payload)
  on conflict (key)
  do update set result_payload = public.idempotency_keys.result_payload
  returning result_payload into final_payload;

  return query
  select
    p_idempotency_key,
    (final_payload->>'committedTodos')::integer,
    coalesce((final_payload->>'skippedTodos')::integer, 0),
    (final_payload->>'auditEventId')::uuid;
end;
$$;

-- write-oriented policy scaffold (owner/member split can tighten in next phase)
drop policy if exists transcripts_member_insert on public.transcripts;
create policy transcripts_member_insert on public.transcripts
  for insert
  with check (public.user_has_workspace_access(workspace_id));

drop policy if exists todos_member_insert on public.todos;
create policy todos_member_insert on public.todos
  for insert
  with check (public.user_has_workspace_access(workspace_id));

drop policy if exists idempotency_member_insert on public.idempotency_keys;
create policy idempotency_member_insert on public.idempotency_keys
  for insert
  with check (public.user_has_workspace_access(workspace_id));

drop policy if exists memberships_owner_insert on public.workspace_memberships;
create policy memberships_owner_insert on public.workspace_memberships
  for insert
  with check (public.user_has_workspace_access(workspace_id));
