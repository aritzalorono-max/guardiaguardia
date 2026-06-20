-- Crear ciclo + sus guardias en una sola transacción (atómico).
-- SECURITY INVOKER (por defecto): la RLS se aplica al usuario que llama.
create or replace function public.create_cycle_with_assignments(
  p_service_id  uuid,
  p_name        text,
  p_start_year  int,
  p_start_month int,
  p_months      int,
  p_assignments jsonb
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_cycle_id uuid;
begin
  insert into public.cycles (service_id, name, start_year, start_month, months, status)
  values (p_service_id, p_name, p_start_year, p_start_month, p_months, 'draft')
  returning id into v_cycle_id;

  insert into public.guard_assignments
    (service_id, cycle_id, date, category, modality, eligible, doctor_id)
  select
    p_service_id,
    v_cycle_id,
    (a->>'date')::date,
    (a->>'category')::guard_day_category,
    (a->>'modality')::guard_modality,
    (a->>'eligible')::slot_eligibility,
    nullif(a->>'doctor_id', '')::uuid
  from jsonb_array_elements(p_assignments) a;

  return v_cycle_id;
end;
$$;

grant execute on function public.create_cycle_with_assignments(uuid, text, int, int, int, jsonb) to authenticated;
