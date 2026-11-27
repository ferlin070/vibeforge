do $audit$
declare
  o uuid := gen_random_uuid();
  a uuid := gen_random_uuid();
  e uuid := gen_random_uuid();
  v uuid := gen_random_uuid();
  x uuid := gen_random_uuid();
  team uuid;
  brief uuid;
  n integer;
  denied boolean;
  payload jsonb := '{"name":"Synthetic team brief","type":"Website","idea":"Test","audience":"","agent":"Universal"}';
begin
  begin
    insert into auth.users(id) values(o),(a),(e),(v),(x);
    perform set_config('role','authenticated',true);
    perform set_config('request.jwt.claim.sub',o::text,true);
    if auth.uid() is distinct from o or current_user <> 'authenticated' then raise exception 'identity mismatch'; end if;
    insert into public.vibeforge_team_spaces(owner_id,name) values(o,'Synthetic team') returning id into team;
    insert into public.vibeforge_team_members(team_id,user_id,role) values(team,a,'admin');
    denied := false;
    begin
      insert into public.vibeforge_team_members(team_id,user_id,role) values(team,o,'viewer');
    exception when insufficient_privilege then denied:=true;
    end;
    if not denied then raise exception 'owner membership duplicate allowed'; end if;
    perform set_config('request.jwt.claim.sub',a::text,true);
    insert into public.vibeforge_team_members(team_id,user_id,role) values(team,e,'editor'),(team,v,'viewer');
    denied := false;
    begin
      update public.vibeforge_team_members set role='admin' where team_id=team and user_id=v;
    exception when insufficient_privilege then denied:=true;
    end;
    if not denied then raise exception 'admin privilege escalation allowed'; end if;
    update public.vibeforge_team_spaces set name='Unauthorized rename' where id=team;
    get diagnostics n=row_count;
    if n<>0 then raise exception 'admin rename allowed'; end if;
    perform set_config('request.jwt.claim.sub',e::text,true);
    insert into public.vibeforge_team_briefs(team_id,author_id,draft) values(team,e,payload) returning id into brief;
    denied:=false;
    begin
      insert into public.vibeforge_team_members(team_id,user_id,role) values(team,x,'viewer');
    exception when insufficient_privilege then denied:=true;
    end;
    if not denied then raise exception 'editor added member'; end if;
    perform set_config('request.jwt.claim.sub',v::text,true);
    select count(*) into n from public.vibeforge_team_briefs where id=brief;
    if n<>1 then raise exception 'viewer read denied'; end if;
    denied:=false;
    begin
      insert into public.vibeforge_team_briefs(team_id,author_id,draft) values(team,v,payload);
    exception when insufficient_privilege then denied:=true;
    end;
    if not denied then raise exception 'viewer published'; end if;
    delete from public.vibeforge_team_briefs where id=brief;
    get diagnostics n=row_count;
    if n<>0 then raise exception 'viewer deleted brief'; end if;
    perform set_config('request.jwt.claim.sub',x::text,true);
    select count(*) into n from public.vibeforge_team_spaces where id=team;
    if n<>0 then raise exception 'outsider saw team'; end if;
    select count(*) into n from public.vibeforge_team_members where team_id=team;
    if n<>0 then raise exception 'outsider saw members'; end if;
    select count(*) into n from public.vibeforge_team_briefs where id=brief;
    if n<>0 then raise exception 'outsider saw brief'; end if;
    denied:=false;
    begin
      insert into public.vibeforge_team_members(team_id,user_id,role) values(team,x,'admin');
    exception when insufficient_privilege then denied:=true;
    end;
    if not denied then raise exception 'outsider self-enrolled'; end if;
    denied:=false;
    begin
      insert into public.vibeforge_team_spaces(owner_id,name) values(o,'Spoofed');
    exception when insufficient_privilege then denied:=true;
    end;
    if not denied then raise exception 'spoofed owner allowed'; end if;
    perform set_config('request.jwt.claim.sub',a::text,true);
    delete from public.vibeforge_team_members where team_id=team and user_id=v;
    get diagnostics n=row_count;
    if n<>1 then raise exception 'admin remove viewer failed'; end if;
    perform set_config('request.jwt.claim.sub',v::text,true);
    select count(*) into n from public.vibeforge_team_briefs where id=brief;
    if n<>0 then raise exception 'revoked viewer retained access'; end if;
    perform set_config('request.jwt.claim.sub',o::text,true);
    update public.vibeforge_team_spaces set name='Renamed synthetic team' where id=team;
    get diagnostics n=row_count;
    if n<>1 then raise exception 'owner rename failed'; end if;
    update public.vibeforge_team_members set role='viewer' where team_id=team and user_id=a;
    get diagnostics n=row_count;
    if n<>1 then raise exception 'owner demotion failed'; end if;
    perform set_config('request.jwt.claim.sub',a::text,true);
    delete from public.vibeforge_team_briefs where id=brief;
    get diagnostics n=row_count;
    if n<>0 then raise exception 'demoted admin retained deletion'; end if;
    perform set_config('request.jwt.claim.sub',o::text,true);
    delete from public.vibeforge_team_briefs where id=brief;
    get diagnostics n=row_count;
    if n<>1 then raise exception 'owner revoke failed'; end if;
    raise exception using errcode='VF003',message='Rollback synthetic team authorization audit';
  exception when sqlstate 'VF003' then
    if exists(select 1 from auth.users where id in(o,a,e,v,x)) or exists(select 1 from public.vibeforge_team_spaces where id=team) or exists(select 1 from public.vibeforge_team_members where team_id=team) or exists(select 1 from public.vibeforge_team_briefs where team_id=team) then raise exception 'rollback failed'; end if;
    perform set_config('vibeforge.team_audit','PASS: owner/admin/editor/viewer/outsider, escalation rejection, revocation, rollback',false);
  end;
end
$audit$;
select current_setting('vibeforge.team_audit',true) as result;