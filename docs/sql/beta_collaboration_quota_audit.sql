do $audit$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  t uuid;
  n integer;
  blocked boolean;
  draft jsonb := '{"name":"Synthetic","type":"Website","idea":"Quota test","audience":"","agent":"Universal"}';
begin
  begin
    insert into auth.users(id) values(a),(b);
    perform set_config('role','authenticated',true);
    perform set_config('request.jwt.claim.sub',a::text,true);
    for i in 1..10 loop
      insert into public.vibeforge_team_spaces(owner_id,name) values(a,'Synthetic team '||i) returning id into t;
    end loop;
    blocked:=false;
    begin
      insert into public.vibeforge_team_spaces(owner_id,name) values(a,'Overflow');
    exception when raise_exception then
      if sqlerrm='Active collaboration limit reached' then blocked:=true; else raise; end if;
    end;
    if not blocked then raise exception 'space active cap failed'; end if;
    for i in 1..30 loop
      insert into public.vibeforge_shared_drafts(sender_id,recipient_id,draft) values(a,b,draft);
      delete from public.vibeforge_shared_drafts where sender_id=a;
    end loop;
    blocked:=false;
    begin
      insert into public.vibeforge_shared_drafts(sender_id,recipient_id,draft) values(a,b,draft);
    exception when raise_exception then
      if sqlerrm='Hourly collaboration limit reached' then blocked:=true; else raise; end if;
    end;
    if not blocked then raise exception 'delete-and-resend bypass allowed'; end if;
    blocked:=false;
    begin
      select count(*) into n from vibeforge_private.write_quota;
    exception when insufficient_privilege then blocked:=true;
    end;
    if not blocked then raise exception 'private quota exposed'; end if;
    perform set_config('request.jwt.claim.sub',b::text,true);
    insert into public.vibeforge_shared_drafts(sender_id,recipient_id,draft) values(b,a,draft);
    raise exception using errcode='VF005',message='rollback';
  exception when sqlstate 'VF005' then
    if exists(select 1 from auth.users where id in(a,b)) or exists(select 1 from public.vibeforge_team_spaces where owner_id=a) or exists(select 1 from public.vibeforge_shared_drafts where sender_id in(a,b)) or exists(select 1 from vibeforge_private.write_quota where user_id in(a,b)) then raise exception 'rollback failed'; end if;
    perform set_config('vibeforge.quota_audit','PASS: active workspace cap, hourly direct-share cap even after deletion, private counters, independent accounts, rollback',false);
  end;
end
$audit$;
select current_setting('vibeforge.quota_audit',true) as result;