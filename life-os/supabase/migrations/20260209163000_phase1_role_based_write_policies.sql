-- Phase 1 hardening: role-aware write policies and helper functions

create or replace function public.workspace_role_rank(p_role text)
returns integer
language sql
immutable
as $$
  select case p_role
    when 'viewer' then 10
    when 'member' then 20
    when 'owner' then 30
    else 0
  end
$$;

create or replace function public.user_has_workspace_role_at_least(
  p_workspace_id text,
  p_min_role text
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = public.current_user_id()
      and public.workspace_role_rank(wm.role) >= public.workspace_role_rank(p_min_role)
  )
$$;

-- workspaces

drop policy if exists workspaces_owner_insert on public.workspaces;
create policy workspaces_owner_insert on public.workspaces
  for insert
  with check (id = public.current_workspace_id());

drop policy if exists workspaces_owner_update on public.workspaces;
create policy workspaces_owner_update on public.workspaces
  for update
  using (public.user_has_workspace_role_at_least(id, 'owner'))
  with check (public.user_has_workspace_role_at_least(id, 'owner'));

drop policy if exists workspaces_owner_delete on public.workspaces;
create policy workspaces_owner_delete on public.workspaces
  for delete
  using (public.user_has_workspace_role_at_least(id, 'owner'));

-- workspace_memberships

drop policy if exists memberships_owner_insert on public.workspace_memberships;
create policy memberships_owner_insert on public.workspace_memberships
  for insert
  with check (public.user_has_workspace_role_at_least(workspace_id, 'owner'));

drop policy if exists memberships_owner_update on public.workspace_memberships;
create policy memberships_owner_update on public.workspace_memberships
  for update
  using (public.user_has_workspace_role_at_least(workspace_id, 'owner'))
  with check (public.user_has_workspace_role_at_least(workspace_id, 'owner'));

drop policy if exists memberships_owner_delete on public.workspace_memberships;
create policy memberships_owner_delete on public.workspace_memberships
  for delete
  using (public.user_has_workspace_role_at_least(workspace_id, 'owner'));

-- transcripts

drop policy if exists transcripts_member_insert on public.transcripts;
create policy transcripts_member_insert on public.transcripts
  for insert
  with check (public.user_has_workspace_role_at_least(workspace_id, 'member'));

drop policy if exists transcripts_member_update on public.transcripts;
create policy transcripts_member_update on public.transcripts
  for update
  using (public.user_has_workspace_role_at_least(workspace_id, 'member'))
  with check (public.user_has_workspace_role_at_least(workspace_id, 'member'));

drop policy if exists transcripts_owner_delete on public.transcripts;
create policy transcripts_owner_delete on public.transcripts
  for delete
  using (public.user_has_workspace_role_at_least(workspace_id, 'owner'));

-- todos

drop policy if exists todos_member_insert on public.todos;
create policy todos_member_insert on public.todos
  for insert
  with check (public.user_has_workspace_role_at_least(workspace_id, 'member'));

drop policy if exists todos_member_update on public.todos;
create policy todos_member_update on public.todos
  for update
  using (public.user_has_workspace_role_at_least(workspace_id, 'member'))
  with check (public.user_has_workspace_role_at_least(workspace_id, 'member'));

drop policy if exists todos_owner_delete on public.todos;
create policy todos_owner_delete on public.todos
  for delete
  using (public.user_has_workspace_role_at_least(workspace_id, 'owner'));

-- audit_events (append-only)

drop policy if exists audit_events_member_insert on public.audit_events;
create policy audit_events_member_insert on public.audit_events
  for insert
  with check (public.user_has_workspace_role_at_least(workspace_id, 'member'));

-- idempotency_keys (append-only)

drop policy if exists idempotency_member_insert on public.idempotency_keys;
create policy idempotency_member_insert on public.idempotency_keys
  for insert
  with check (public.user_has_workspace_role_at_least(workspace_id, 'member'));