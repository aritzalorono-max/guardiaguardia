-- ============================================================
-- Endurecer RLS + rendimiento
-- ============================================================

-- 1) SEGURIDAD: el alta de servicios y de miembros se hace SOLO mediante la
--    función segura create_service (SECURITY DEFINER). Quitamos las políticas
--    de INSERT directas desde el cliente, que permitían:
--      - memberships_insert: que un usuario se uniera a CUALQUIER servicio.
--      - services_insert: crear servicios huérfanos.
drop policy if exists services_insert    on public.services;
drop policy if exists memberships_insert  on public.memberships;
drop policy if exists memberships_delete  on public.memberships;

-- 2) RENDIMIENTO: cachear auth.uid() por consulta en lugar de por fila.
drop policy if exists memberships_select on public.memberships;
create policy memberships_select on public.memberships
  for select using (user_id = (select auth.uid()));

-- 3) RENDIMIENTO: índice en la clave foránea sin cubrir.
create index if not exists idx_absences_day_type
  on public.absences(day_type_id);
