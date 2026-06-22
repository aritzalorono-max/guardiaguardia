-- Registra qué años ya tienen los festivos nacionales precargados, para no
-- volver a añadir los que el usuario haya quitado a propósito.
create table public.seeded_holiday_years (
  id         uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  year       int not null,
  created_at timestamptz not null default now(),
  unique (service_id, year)
);
create index idx_seeded_holiday_years_service on public.seeded_holiday_years(service_id);

alter table public.seeded_holiday_years enable row level security;
create policy seeded_holiday_years_all on public.seeded_holiday_years
  for all using (public.is_member_of(service_id)) with check (public.is_member_of(service_id));
