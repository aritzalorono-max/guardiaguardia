-- Quitar el acceso de anónimos a las funciones de cuenta (solo autenticados).
revoke execute on function public.delete_my_account()       from anon, public;
revoke execute on function public.share_service(text)        from anon, public;
revoke execute on function public.list_service_members()     from anon, public;
revoke execute on function public.remove_member(uuid)        from anon, public;

grant execute on function public.delete_my_account()    to authenticated;
grant execute on function public.share_service(text)    to authenticated;
grant execute on function public.list_service_members() to authenticated;
grant execute on function public.remove_member(uuid)    to authenticated;
