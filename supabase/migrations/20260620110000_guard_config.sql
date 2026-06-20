-- ============================================================
-- Configuración de guardias (Fase 5)
-- ============================================================

-- Categoría del día a efectos de guardia (las 3 que importan para la equidad)
create type guard_day_category as enum ('laborable', 'vispera', 'festivo');

-- Modalidad de la guardia
create type guard_modality as enum ('presencial', 'localizada', 'telefonica');

-- Quién puede cubrir un puesto
create type slot_eligibility as enum ('cualquiera', 'adjunto', 'residente');

-- ------------------------------------------------------------
-- PUESTOS DE GUARDIA: qué hay que cubrir en cada categoría de día.
-- El nº de personas por día = nº de filas de esa categoría.
-- ------------------------------------------------------------
create table public.guard_slots (
  id           uuid primary key default gen_random_uuid(),
  service_id   uuid not null references public.services(id) on delete cascade,
  day_category guard_day_category not null,
  modality     guard_modality not null default 'presencial',
  eligible     slot_eligibility not null default 'cualquiera',
  weight       numeric(5,2) not null default 1,   -- peso/carga (desempate de equidad)
  label        text,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);
create index idx_guard_slots_service on public.guard_slots(service_id);

-- ------------------------------------------------------------
-- REGLAS DEL SERVICIO: estado (activada/valor) de cada regla.
-- El catálogo de reglas vive en el código; aquí guardamos su estado.
-- ------------------------------------------------------------
create table public.service_rules (
  id         uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  rule_key   text not null,
  enabled    boolean not null default false,
  value      int,                              -- parámetro (días, topes…)
  updated_at timestamptz not null default now(),
  unique (service_id, rule_key)
);
create index idx_service_rules_service on public.service_rules(service_id);

-- RLS
alter table public.guard_slots   enable row level security;
alter table public.service_rules enable row level security;

create policy guard_slots_all on public.guard_slots
  for all using (public.is_member_of(service_id)) with check (public.is_member_of(service_id));
create policy service_rules_all on public.service_rules
  for all using (public.is_member_of(service_id)) with check (public.is_member_of(service_id));
