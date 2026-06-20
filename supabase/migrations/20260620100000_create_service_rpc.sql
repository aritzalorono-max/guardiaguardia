-- Alta atómica de un servicio: crea el servicio, da de alta al usuario
-- actual como admin y siembra los 4 tipos de día base. Todo en una transacción.
create or replace function public.create_service(
  p_hospital_name  text,
  p_specialty      text,
  p_region         text,
  p_approx_doctors int,
  p_has_residents  boolean
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  insert into public.services
    (hospital_name, specialty, region, approx_doctors, has_residents, onboarding_completed)
  values
    (p_hospital_name, p_specialty, p_region, p_approx_doctors, coalesce(p_has_residents, true), true)
  returning id into v_service_id;

  insert into public.memberships (service_id, user_id, role)
  values (v_service_id, auth.uid(), 'admin');

  insert into public.day_types
    (service_id, name, counts_as_worked, allows_guard, color, is_system)
  values
    (v_service_id, 'Vacaciones',    false, false, '#f59e0b', true),
    (v_service_id, 'Baja',          true,  true,  '#ef4444', true),
    (v_service_id, 'Permiso',       false, false, '#8b5cf6', true),
    (v_service_id, 'No disponible', true,  false, '#64748b', true);

  return v_service_id;
end;
$$;

revoke execute on function public.create_service(text,text,text,int,boolean) from anon, public;
grant execute on function public.create_service(text,text,text,int,boolean) to authenticated;
