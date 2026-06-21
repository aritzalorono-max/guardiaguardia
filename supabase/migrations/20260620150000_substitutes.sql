-- Sustitutos para guardias de personas de baja
alter table public.day_types add column if not exists needs_substitute boolean not null default false;
update public.day_types set needs_substitute = true where is_system = true and name = 'Baja';
alter table public.guard_assignments add column if not exists substitute_doctor_id uuid references public.doctors(id) on delete set null;

create or replace function public.create_service(
  p_hospital_name text, p_specialty text, p_region text, p_approx_doctors int, p_has_residents boolean
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_service_id uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  insert into public.services (hospital_name, specialty, region, approx_doctors, has_residents, onboarding_completed)
  values (p_hospital_name, p_specialty, p_region, p_approx_doctors, coalesce(p_has_residents, true), true)
  returning id into v_service_id;
  insert into public.memberships (service_id, user_id, role) values (v_service_id, auth.uid(), 'admin');
  insert into public.day_types (service_id, name, counts_as_worked, allows_guard, needs_substitute, color, is_system)
  values
    (v_service_id, 'Vacaciones', false, false, false, '#f59e0b', true),
    (v_service_id, 'Baja', true, true, true, '#ef4444', true),
    (v_service_id, 'Permiso', false, false, false, '#8b5cf6', true),
    (v_service_id, 'No disponible', true, false, false, '#64748b', true);
  return v_service_id;
end; $$;
revoke execute on function public.create_service(text,text,text,int,boolean) from anon, public;
grant execute on function public.create_service(text,text,text,int,boolean) to authenticated;

create or replace function public.create_cycle_with_assignments(
  p_service_id uuid, p_name text, p_start_year int, p_start_month int, p_months int, p_assignments jsonb
) returns uuid language plpgsql set search_path = public as $$
declare v_cycle_id uuid;
begin
  insert into public.cycles (service_id, name, start_year, start_month, months, status)
  values (p_service_id, p_name, p_start_year, p_start_month, p_months, 'draft')
  returning id into v_cycle_id;
  insert into public.guard_assignments
    (service_id, cycle_id, date, category, modality, eligible, doctor_id, substitute_doctor_id)
  select p_service_id, v_cycle_id, (a->>'date')::date, (a->>'category')::guard_day_category,
    (a->>'modality')::guard_modality, (a->>'eligible')::slot_eligibility,
    nullif(a->>'doctor_id','')::uuid, nullif(a->>'substitute_doctor_id','')::uuid
  from jsonb_array_elements(p_assignments) a;
  return v_cycle_id;
end; $$;
grant execute on function public.create_cycle_with_assignments(uuid, text, int, int, int, jsonb) to authenticated;
