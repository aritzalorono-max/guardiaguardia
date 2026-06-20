-- Cachear auth.uid() por consulta (en lugar de por fila) dentro del helper.
create or replace function public.is_member_of(p_service_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists(
    select 1 from public.memberships m
    where m.service_id = p_service_id and m.user_id = (select auth.uid())
  );
$$;
