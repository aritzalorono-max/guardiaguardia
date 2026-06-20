-- ============================================================
-- Ciclos de reparto y guardias asignadas (Fase 6b)
-- ============================================================

create table public.cycles (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.services(id) on delete cascade,
  name        text,
  start_year  int not null,
  start_month int not null,            -- 0-based (0 = enero)
  months      int not null,
  status      text not null default 'draft',  -- draft | published
  created_at  timestamptz not null default now()
);
create index idx_cycles_service on public.cycles(service_id);

create table public.guard_assignments (
  id         uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  cycle_id   uuid not null references public.cycles(id) on delete cascade,
  date       date not null,
  category   guard_day_category not null,
  modality   guard_modality not null,
  eligible   slot_eligibility not null,
  doctor_id  uuid references public.doctors(id) on delete set null,
  manual     boolean not null default false,   -- editado a mano
  created_at timestamptz not null default now()
);
create index idx_ga_cycle on public.guard_assignments(cycle_id);
create index idx_ga_service on public.guard_assignments(service_id);
create index idx_ga_doctor on public.guard_assignments(doctor_id);

alter table public.cycles            enable row level security;
alter table public.guard_assignments enable row level security;

create policy cycles_all on public.cycles
  for all using (public.is_member_of(service_id)) with check (public.is_member_of(service_id));
create policy guard_assignments_all on public.guard_assignments
  for all using (public.is_member_of(service_id)) with check (public.is_member_of(service_id));
