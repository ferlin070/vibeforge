-- Additive group collaboration pilot; existing personal snapshots are unchanged.
create schema vibeforge_private;
revoke all on schema vibeforge_private from public, anon, authenticated;
grant usage on schema vibeforge_private to authenticated;

create table public.vibeforge_team_spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);
create index vf_team_owner_idx on public.vibeforge_team_spaces(owner_id);

create table public.vibeforge_team_members (
  team_id uuid not null references public.vibeforge_team_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key(team_id,user_id)
);
create index vf_team_member_user_idx on public.vibeforge_team_members(user_id);

create table public.vibeforge_team_briefs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.vibeforge_team_spaces(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  draft jsonb not null,
  created_at timestamptz not null default now(),
  constraint vf_team_brief_shape check (
    jsonb_typeof(draft) = 'object'
    and octet_length(draft::text) <= 60000
    and draft ?& array['name','type','idea','audience','agent']
    and (draft - array['name','type','idea','audience','agent']) = '{}'::jsonb
    and jsonb_typeof(draft->'name') = 'string'
    and jsonb_typeof(draft->'type') = 'string'
    and jsonb_typeof(draft->'idea') = 'string'
    and jsonb_typeof(draft->'audience') = 'string'
    and jsonb_typeof(draft->'agent') = 'string'
    and length(btrim(draft->>'name')) between 1 and 200
    and length(draft->>'type') between 1 and 100
    and length(btrim(draft->>'idea')) between 1 and 12000
    and length(draft->>'audience') <= 500
    and length(draft->>'agent') between 1 and 100
  )
);
create index vf_team_briefs_team_idx on public.vibeforge_team_briefs(team_id,created_at desc);
create index vf_team_briefs_author_idx on public.vibeforge_team_briefs(author_id);

alter table public.vibeforge_team_spaces enable row level security;
alter table public.vibeforge_team_members enable row level security;
alter table public.vibeforge_team_briefs enable row level security;
revoke all on public.vibeforge_team_spaces, public.vibeforge_team_members, public.vibeforge_team_briefs from public, anon, authenticated;
grant select on public.vibeforge_team_spaces, public.vibeforge_team_members, public.vibeforge_team_briefs to authenticated;
grant insert(owner_id,name) on public.vibeforge_team_spaces to authenticated;
grant update(name) on public.vibeforge_team_spaces to authenticated;
grant insert(team_id,user_id,role), update(role) on public.vibeforge_team_members to authenticated;
grant delete on public.vibeforge_team_members, public.vibeforge_team_briefs to authenticated;
grant insert(team_id,author_id,draft) on public.vibeforge_team_briefs to authenticated;

-- Private lookup breaks RLS recursion. It only reveals the caller's own role.
create function vibeforge_private.team_role(target uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select case when s.owner_id = (select auth.uid()) then 'owner'
    else m.role end
  from public.vibeforge_team_spaces s
  left join public.vibeforge_team_members m
    on m.team_id = s.id and m.user_id = (select auth.uid())
  where s.id = target and auth.uid() is not null
$$;
revoke all on function vibeforge_private.team_role(uuid) from public, anon, authenticated;
grant execute on function vibeforge_private.team_role(uuid) to authenticated;

create policy vf_team_read on public.vibeforge_team_spaces for select to authenticated
  using (owner_id = (select auth.uid()) or (select vibeforge_private.team_role(id)) is not null);
create policy vf_team_create on public.vibeforge_team_spaces for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy vf_team_rename on public.vibeforge_team_spaces for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy vf_member_read on public.vibeforge_team_members for select to authenticated
  using ((select vibeforge_private.team_role(team_id)) is not null);
create policy vf_member_add on public.vibeforge_team_members for insert to authenticated
  with check (
    not exists (select 1 from public.vibeforge_team_spaces s where s.id = team_id and s.owner_id = user_id)
    and ((select vibeforge_private.team_role(team_id)) = 'owner'
      or ((select vibeforge_private.team_role(team_id)) = 'admin' and role in ('editor','viewer')))
  );
create policy vf_member_change on public.vibeforge_team_members for update to authenticated
  using ((select vibeforge_private.team_role(team_id)) = 'owner'
    or ((select vibeforge_private.team_role(team_id)) = 'admin' and role in ('editor','viewer')))
  with check ((select vibeforge_private.team_role(team_id)) = 'owner'
    or ((select vibeforge_private.team_role(team_id)) = 'admin' and role in ('editor','viewer')));
create policy vf_member_remove on public.vibeforge_team_members for delete to authenticated
  using (user_id = (select auth.uid())
    or (select vibeforge_private.team_role(team_id)) = 'owner'
    or ((select vibeforge_private.team_role(team_id)) = 'admin' and role in ('editor','viewer')));

create policy vf_team_brief_read on public.vibeforge_team_briefs for select to authenticated
  using ((select vibeforge_private.team_role(team_id)) is not null);
create policy vf_team_brief_publish on public.vibeforge_team_briefs for insert to authenticated
  with check (author_id = (select auth.uid())
    and (select vibeforge_private.team_role(team_id)) in ('owner','admin','editor'));
create policy vf_team_brief_revoke on public.vibeforge_team_briefs for delete to authenticated
  using ((select vibeforge_private.team_role(team_id)) in ('owner','admin')
    or ((select vibeforge_private.team_role(team_id)) = 'editor' and author_id = (select auth.uid())));
