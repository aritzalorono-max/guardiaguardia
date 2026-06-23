-- Permite marcar una fecha como "no festivo" (override), por ejemplo un
-- fin de semana que en ese servicio se trabaja con normalidad.
-- Filas con is_festivo = true: festivo. is_festivo = false: forzado laborable.
alter table public.holidays
  add column if not exists is_festivo boolean not null default true;
