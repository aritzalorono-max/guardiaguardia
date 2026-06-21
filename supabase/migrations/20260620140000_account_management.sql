-- ============================================================
-- Gestión de cuenta: borrar cuenta y compartir servicio
-- ============================================================

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_svc uuid[];
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select array_agg(service_id) into v_svc from public.memberships where user_id = v_uid;
  delete from public.memberships where user_id = v_uid;
  if v_svc is not null then
    delete from public.services s
    where s.id = any(v_svc)
      and not exists (select 1 from public.memberships m where m.service_id = s.id);
  end if;
  delete from auth.users where id = v_uid;
end; $$;
grant execute on function public.delete_my_account() to authenticated;

create or replace function public.share_service(p_email text)
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_service uuid; v_target uuid;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select service_id into v_service from public.memberships where user_id = v_uid limit 1;
  if v_service is null then raise exception 'No tienes un servicio'; end if;
  select id into v_target from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_target is null then return 'no_user'; end if;
  if v_target = v_uid then return 'self'; end if;
  insert into public.memberships (service_id, user_id, role)
  values (v_service, v_target, 'admin')
  on conflict (service_id, user_id) do nothing;
  return 'ok';
end; $$;
grant execute on function public.share_service(text) to authenticated;

create or replace function public.list_service_members()
returns json language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_service uuid;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select service_id into v_service from public.memberships where user_id = v_uid limit 1;
  if v_service is null then return '[]'::json; end if;
  return (
    select coalesce(json_agg(json_build_object(
      'user_id', m.user_id, 'email', u.email, 'role', m.role, 'is_me', (m.user_id = v_uid)
    ) order by u.email), '[]'::json)
    from public.memberships m join auth.users u on u.id = m.user_id
    where m.service_id = v_service
  );
end; $$;
grant execute on function public.list_service_members() to authenticated;

create or replace function public.remove_member(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_service uuid;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if p_user_id = v_uid then raise exception 'No puedes quitarte el acceso a ti mismo'; end if;
  select service_id into v_service from public.memberships where user_id = v_uid limit 1;
  if v_service is null then raise exception 'No tienes un servicio'; end if;
  delete from public.memberships where service_id = v_service and user_id = p_user_id;
end; $$;
grant execute on function public.remove_member(uuid) to authenticated;
