-- Additive RC12 pilot. Personal snapshots and their policies are unchanged.
create table public.vibeforge_shared_drafts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  draft jsonb not null,
  created_at timestamptz not null default now(),
  constraint distinct_recipient check (sender_id <> recipient_id),
  constraint draft_shape check (
    jsonb_typeof(draft) = 'object'
    and octet_length(draft::text) <= 60000
    and draft ?& array['name','type','idea','audience','agent']
    and (draft - array['name','type','idea','audience','agent']) = '{}'::jsonb
    and jsonb_typeof(draft->'name') = 'string'
    and jsonb_typeof(draft->'type') = 'string'
    and jsonb_typeof(draft->'idea') = 'string'
    and jsonb_typeof(draft->'audience') = 'string'
    and jsonb_typeof(draft->'agent') = 'string'
    and length(draft->>'name') between 1 and 200
    and length(draft->>'type') between 1 and 100
    and length(draft->>'idea') between 1 and 12000
    and length(draft->>'audience') <= 500
    and length(draft->>'agent') between 1 and 100
  )
);
alter table public.vibeforge_shared_drafts enable row level security;
revoke all on public.vibeforge_shared_drafts from public, anon, authenticated;
grant select, delete on public.vibeforge_shared_drafts to authenticated;
grant insert (sender_id, recipient_id, draft) on public.vibeforge_shared_drafts to authenticated;
create index shared_drafts_sender_idx on public.vibeforge_shared_drafts(sender_id, created_at desc);
create index shared_drafts_recipient_idx on public.vibeforge_shared_drafts(recipient_id, created_at desc);
create policy shared_drafts_read on public.vibeforge_shared_drafts
  for select to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));
create policy shared_drafts_send on public.vibeforge_shared_drafts
  for insert to authenticated
  with check ((select auth.uid()) = sender_id);
create policy shared_drafts_revoke on public.vibeforge_shared_drafts
  for delete to authenticated
  using ((select auth.uid()) = sender_id);
