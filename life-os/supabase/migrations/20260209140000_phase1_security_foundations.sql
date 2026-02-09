-- Phase 1 security foundations: workspace membership model + RLS scaffolding

create table if not exists public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists idx_workspace_memberships_workspace_user
  on public.workspace_memberships (workspace_id, user_id);

create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

create or replace function public.current_workspace_id()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'workspace_id', '')::text
$$;

create or replace function public.user_has_workspace_access(p_workspace_id text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = public.current_user_id()
  )
$$;

alter table public.workspaces enable row level security;
alter table public.transcripts enable row level security;
alter table public.todos enable row level security;
alter table public.audit_events enable row level security;
alter table public.idempotency_keys enable row level security;
alter table public.workspace_memberships enable row level security;

-- Initial permissive membership-oriented read policies (write policies tighten in next phase)
drop policy if exists workspaces_member_read on public.workspaces;
create policy workspaces_member_read on public.workspaces
  for select
  using (public.user_has_workspace_access(id));

drop policy if exists transcripts_member_read on public.transcripts;
create policy transcripts_member_read on public.transcripts
  for select
  using (public.user_has_workspace_access(workspace_id));

drop policy if exists todos_member_read on public.todos;
create policy todos_member_read on public.todos
  for select
  using (public.user_has_workspace_access(workspace_id));

drop policy if exists audit_events_member_read on public.audit_events;
create policy audit_events_member_read on public.audit_events
  for select
  using (public.user_has_workspace_access(workspace_id));

drop policy if exists idempotency_member_read on public.idempotency_keys;
create policy idempotency_member_read on public.idempotency_keys
  for select
  using (public.user_has_workspace_access(workspace_id));

drop policy if exists memberships_self_or_workspace_read on public.workspace_memberships;
create policy memberships_self_or_workspace_read on public.workspace_memberships
  for select
  using (
    user_id = public.current_user_id()
    or public.user_has_workspace_access(workspace_id)
  );
