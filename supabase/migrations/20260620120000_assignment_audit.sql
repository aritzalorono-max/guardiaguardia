-- ============================================================
-- Auditoría de cambios manuales en el reparto (Fase 7)
-- ============================================================
create table public.assignment_audit (
  id            uuid primary key default gen_random_uuid(),
  service_id    uuid not null references public.services(id) on delete cascade,
  cycle_id      uuid not null references public.cycles(id) on delete cascade,
  assignment_id uuid,            -- sin FK: conservamos el historial aunque se borre
  date          date not null,
  actor_email   text,
  old_doctor_id uuid,
  new_doctor_id uuid,
  created_at    timestamptz not null default now()
);
create index idx_audit_cycle on public.assignment_audit(cycle_id);
create index idx_audit_service on public.assignment_audit(service_id);

alter table public.assignment_audit enable row level security;
create policy assignment_audit_all on public.assignment_audit
  for all using (public.is_member_of(service_id)) with check (public.is_member_of(service_id));
