-- ============================================================
-- GuardiaGuardia — Esquema fundacional (Fase 0)
-- Multitenancy por servicio + RLS
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
create type membership_role as enum ('admin', 'editor', 'viewer');
create type doctor_kind     as enum ('adjunto', 'residente');
create type resident_level  as enum ('R1','R2','R3','R4','R5');

-- ---------- updated_at helper ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- SERVICES (tenant: hospital + servicio)
-- ============================================================
create table public.services (
  id                   uuid primary key default gen_random_uuid(),
  hospital_name        text not null,
  specialty            text not null,
  region               text,                 -- comunidad / provincia
  approx_doctors       int,
  has_residents        boolean not null default true,
  onboarding_completed boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger trg_services_updated
  before update on public.services
  for each row execute function public.set_updated_at();

-- ============================================================
-- MEMBERSHIPS (auth.users <-> services)
-- ============================================================
create table public.memberships (
  id         uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       membership_role not null default 'admin',
  created_at timestamptz not null default now(),
  unique (service_id, user_id)
);
create index idx_memberships_user on public.memberships(user_id);
create index idx_memberships_service on public.memberships(service_id);

-- Helper: ¿el usuario actual pertenece al servicio? (SECURITY DEFINER evita recursión RLS)
create or replace function public.is_member_of(p_service_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists(
    select 1 from public.memberships m
    where m.service_id = p_service_id and m.user_id = auth.uid()
  );
$$;
revoke execute on function public.is_member_of(uuid) from anon, public;
grant execute on function public.is_member_of(uuid) to authenticated;

-- ============================================================
-- DOCTORS
-- ============================================================
create table public.doctors (
  id             uuid primary key default gen_random_uuid(),
  service_id     uuid not null references public.services(id) on delete cascade,
  first_name     text not null,
  last_name      text not null,
  kind           doctor_kind not null default 'adjunto',
  resident_level resident_level,             -- null si es adjunto
  is_active      boolean not null default true,   -- está trabajando
  does_guards    boolean not null default true,   -- hace guardias
  part_time      boolean not null default false,  -- jornada parcial
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint resident_level_only_for_residents
    check (kind = 'residente' or resident_level is null)
);
create index idx_doctors_service on public.doctors(service_id);
create trigger trg_doctors_updated
  before update on public.doctors
  for each row execute function public.set_updated_at();

-- ============================================================
-- DAY TYPES (tipos de día especial: matriz trabaja/guardia)
-- ============================================================
create table public.day_types (
  id               uuid primary key default gen_random_uuid(),
  service_id       uuid not null references public.services(id) on delete cascade,
  name             text not null,
  counts_as_worked boolean not null,   -- ¿cuenta como día trabajado?
  allows_guard     boolean not null,   -- ¿puede hacer guardia ese día?
  blocks_adjacent  boolean not null default false, -- bloquea víspera/día siguiente
  color            text not null default '#94a3b8',
  is_system        boolean not null default false, -- los 4 tipos base
  created_at       timestamptz not null default now()
);
create index idx_day_types_service on public.day_types(service_id);

-- ============================================================
-- HOLIDAYS (festivos del calendario laboral del servicio)
-- ============================================================
create table public.holidays (
  id         uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  date       date not null,
  name       text,
  is_eve     boolean not null default false,  -- víspera de festivo
  created_at timestamptz not null default now(),
  unique (service_id, date)
);
create index idx_holidays_service on public.holidays(service_id);

-- ============================================================
-- ABSENCES (días especiales asignados a un médico, por rango)
-- ============================================================
create table public.absences (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.services(id) on delete cascade,
  doctor_id   uuid not null references public.doctors(id) on delete cascade,
  day_type_id uuid not null references public.day_types(id) on delete restrict,
  start_date  date not null,
  end_date    date not null,
  note        text,
  created_at  timestamptz not null default now(),
  constraint absence_date_order check (end_date >= start_date)
);
create index idx_absences_service on public.absences(service_id);
create index idx_absences_doctor on public.absences(doctor_id);

-- ============================================================
-- RLS
-- ============================================================
alter table public.services    enable row level security;
alter table public.memberships enable row level security;
alter table public.doctors     enable row level security;
alter table public.day_types   enable row level security;
alter table public.holidays    enable row level security;
alter table public.absences    enable row level security;

-- SERVICES
create policy services_select on public.services
  for select using (public.is_member_of(id));
create policy services_update on public.services
  for update using (public.is_member_of(id));
create policy services_delete on public.services
  for delete using (public.is_member_of(id));
create policy services_insert on public.services
  for insert with check (auth.uid() is not null);

-- MEMBERSHIPS
create policy memberships_select on public.memberships
  for select using (user_id = auth.uid());
create policy memberships_insert on public.memberships
  for insert with check (user_id = auth.uid());
create policy memberships_delete on public.memberships
  for delete using (user_id = auth.uid());

-- Tablas hijas
create policy doctors_all on public.doctors
  for all using (public.is_member_of(service_id)) with check (public.is_member_of(service_id));
create policy day_types_all on public.day_types
  for all using (public.is_member_of(service_id)) with check (public.is_member_of(service_id));
create policy holidays_all on public.holidays
  for all using (public.is_member_of(service_id)) with check (public.is_member_of(service_id));
create policy absences_all on public.absences
  for all using (public.is_member_of(service_id)) with check (public.is_member_of(service_id));
