-- ============================================================
-- Bajas a mitad de ciclo (Fase 8)
-- Registra que un médico no está disponible en una ventana del ciclo.
-- Permite reactivar (borrar) o alargar (editar end_date).
-- ============================================================
create table public.cycle_leaves (
  id         uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  cycle_id   uuid not null references public.cycles(id) on delete cascade,
  doctor_id  uuid not null references public.doctors(id) on delete cascade,
  start_date date not null,
  end_date   date not null,
  note       text,
  created_at timestamptz not null default now()
);
create index idx_cycle_leaves_cycle on public.cycle_leaves(cycle_id);

alter table public.cycle_leaves enable row level security;
create policy cycle_leaves_all on public.cycle_leaves
  for all using (public.is_member_of(service_id)) with check (public.is_member_of(service_id));
