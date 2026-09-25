-- Dziki Typer: administracyjna komenda @wszyscy
-- Uruchom jednorazowo w Supabase SQL Editor.

create or replace function public.admin_broadcast_chat(p_message text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_message text := btrim(coalesce(p_message, ''));
  v_message_id bigint;
begin
  if v_user_id is null then
    raise exception 'Musisz być zalogowany.';
  end if;

  if not public.is_admin() then
    raise exception 'Komendy @wszyscy może używać tylko administrator.';
  end if;

  if v_message = '' or char_length(v_message) > 500 then
    raise exception 'Wiadomość musi mieć od 1 do 500 znaków.';
  end if;

  if v_message !~* '(^|[[:space:]])@wszyscy([[:space:]]|$|[,.!?;:])' then
    raise exception 'Wiadomość zbiorowa musi zawierać @wszyscy.';
  end if;

  if exists (
    select 1
    from public.chat_messages
    where user_id = v_user_id
      and message ~* '(^|[[:space:]])@wszyscy([[:space:]]|$|[,.!?;:])'
      and created_at > now() - interval '5 minutes'
  ) then
    raise exception 'Kolejne powiadomienie @wszyscy można wysłać po 5 minutach.';
  end if;

  insert into public.chat_messages(user_id, message)
  values (v_user_id, v_message)
  returning id into v_message_id;

  insert into public.notifications(user_id, text, is_read, message_id)
  select p.id,
         '📣 ' || v_message,
         false,
         v_message_id
  from public.profiles p
  where p.id <> v_user_id;

  return v_message_id;
end;
$$;

revoke all on function public.admin_broadcast_chat(text) from public;
grant execute on function public.admin_broadcast_chat(text) to authenticated;
