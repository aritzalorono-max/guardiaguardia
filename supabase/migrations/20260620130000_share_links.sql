-- ============================================================
-- Enlaces de solo lectura para compartir un reparto (Fase 9)
-- ============================================================
create table public.share_links (
  id         uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  cycle_id   uuid not null references public.cycles(id) on delete cascade,
  token      text not null unique default encode(gen_random_bytes(16), 'hex'),
  expires_at timestamptz,                         -- null = sin caducidad
  created_at timestamptz not null default now()
);
create index idx_share_links_cycle on public.share_links(cycle_id);

alter table public.share_links enable row level security;
create policy share_links_all on public.share_links
  for all using (public.is_member_of(service_id)) with check (public.is_member_of(service_id));

-- Lectura pública del reparto SOLO con un token válido y no caducado.
create or replace function public.get_shared_cycle(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link  public.share_links%rowtype;
  v_result json;
begin
  select * into v_link from public.share_links where token = p_token;
  if not found then
    return null;
  end if;
  if v_link.expires_at is not null and v_link.expires_at < now() then
    return json_build_object('expired', true);
  end if;

  select json_build_object(
    'expired', false,
    'service', (
      select json_build_object('hospital_name', s.hospital_name, 'specialty', s.specialty)
      from public.services s where s.id = v_link.service_id
    ),
    'cycle', (
      select json_build_object(
        'name', c.name, 'start_year', c.start_year,
        'start_month', c.start_month, 'months', c.months, 'status', c.status)
      from public.cycles c where c.id = v_link.cycle_id
    ),
    'assignments', (
      select coalesce(json_agg(json_build_object(
        'date', ga.date,
        'category', ga.category,
        'modality', ga.modality,
        'doctor', case when d.id is null then null else (d.last_name || ', ' || d.first_name) end,
        'surname', d.last_name
      ) order by ga.date), '[]'::json)
      from public.guard_assignments ga
      left join public.doctors d on d.id = ga.doctor_id
      where ga.cycle_id = v_link.cycle_id
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.get_shared_cycle(text) from public;
grant execute on function public.get_shared_cycle(text) to anon, authenticated;
