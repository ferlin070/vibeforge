-- Bounded active records and fixed-hour successful insert quotas.
-- This does not replace Auth signup limits or global abuse monitoring.
create table vibeforge_private.write_quota (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('space','member','publication','direct_share')),
  window_start timestamptz not null,
  used integer not null check (used > 0),
  primary key(user_id,kind)
);
alter table vibeforge_private.write_quota enable row level security;
revoke all on vibeforge_private.write_quota from public, anon, authenticated;

create function vibeforge_private.limit_collaboration_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  operation text;
  bucket timestamptz;
  count_now bigint;
  max_active integer;
  max_hourly integer;
  lock_key text;
begin
  if actor is null then raise exception 'Authenticated collaboration required' using errcode='42501'; end if;
  if tg_table_name = 'vibeforge_team_spaces' then
    if new.owner_id is distinct from actor then raise exception 'Owner mismatch' using errcode='42501'; end if;
    operation := 'space'; max_active := 10; max_hourly := 10;
    lock_key := actor::text;
  elsif tg_table_name = 'vibeforge_team_members' then
    if coalesce(vibeforge_private.team_role(new.team_id),'') not in ('owner','admin') then raise exception 'Membership permission required' using errcode='42501'; end if;
    operation := 'member'; max_active := 50; max_hourly := 30;
    lock_key := new.team_id::text;
  elsif tg_table_name = 'vibeforge_team_briefs' then
    if new.author_id is distinct from actor or coalesce(vibeforge_private.team_role(new.team_id),'') not in ('owner','admin','editor') then raise exception 'Publication permission required' using errcode='42501'; end if;
    operation := 'publication'; max_active := 100; max_hourly := 30;
    lock_key := new.team_id::text;
  elsif tg_table_name = 'vibeforge_shared_drafts' then
    if new.sender_id is distinct from actor then raise exception 'Sender mismatch' using errcode='42501'; end if;
    operation := 'direct_share'; max_active := 100; max_hourly := 30;
    lock_key := actor::text;
  else
    raise exception 'Unexpected collaboration quota trigger';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('vibeforge:' || operation || ':' || lock_key,0));
  if operation = 'space' then
    select count(*) into count_now from public.vibeforge_team_spaces where owner_id=actor;
  elsif operation = 'member' then
    select count(*) into count_now from public.vibeforge_team_members where team_id=new.team_id;
  elsif operation = 'publication' then
    select count(*) into count_now from public.vibeforge_team_briefs where team_id=new.team_id;
  else
    select count(*) into count_now from public.vibeforge_shared_drafts where sender_id=actor;
  end if;
  if count_now >= max_active then raise exception 'Active collaboration limit reached' using errcode='P0001'; end if;
  bucket := pg_catalog.date_trunc('hour',pg_catalog.clock_timestamp());
  insert into vibeforge_private.write_quota as q(user_id,kind,window_start,used)
    values(actor,operation,bucket,1)
    on conflict(user_id,kind) do update set
      window_start=greatest(q.window_start,excluded.window_start),
      used=case when q.window_start>=excluded.window_start then q.used+1 else 1 end
    returning used into count_now;
  if count_now > max_hourly then raise exception 'Hourly collaboration limit reached' using errcode='P0001'; end if;
  return new;
end
$$;
revoke all on function vibeforge_private.limit_collaboration_insert() from public, anon, authenticated;
create trigger vf_space_limit before insert on public.vibeforge_team_spaces
  for each row execute function vibeforge_private.limit_collaboration_insert();
create trigger vf_member_limit before insert on public.vibeforge_team_members
  for each row execute function vibeforge_private.limit_collaboration_insert();
create trigger vf_publication_limit before insert on public.vibeforge_team_briefs
  for each row execute function vibeforge_private.limit_collaboration_insert();
create trigger vf_direct_share_limit before insert on public.vibeforge_shared_drafts
  for each row execute function vibeforge_private.limit_collaboration_insert();
