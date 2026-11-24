-- Run only in a NEW dedicated VibeForge Supabase project after review.
create table public.vibeforge_projects (
 owner_id uuid not null references auth.users(id) on delete cascade,
 id text not null check (length(id) between 1 and 100),
 project jsonb not null check (jsonb_typeof(project) = 'object' and octet_length(project::text) <= 1500000),
 updated_at timestamptz not null default now(),
 primary key(owner_id,id)
);
alter table public.vibeforge_projects enable row level security;
revoke all on public.vibeforge_projects from anon, authenticated;
grant select,insert,update,delete on public.vibeforge_projects to authenticated;
create policy "owners select" on public.vibeforge_projects for select to authenticated using ((select auth.uid())=owner_id);
create policy "owners insert" on public.vibeforge_projects for insert to authenticated with check ((select auth.uid())=owner_id);
create policy "owners update" on public.vibeforge_projects for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
create policy "owners delete" on public.vibeforge_projects for delete to authenticated using ((select auth.uid())=owner_id);
