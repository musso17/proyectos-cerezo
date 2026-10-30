-- Fase 1 · Oficina sin mapa
-- Aplicar en Supabase → SQL Editor. Ver docs/oficina/fase-1.md.
-- Requiere la fase 0 (office_members, is_team_member()).

begin;

-- ─── 1. WhatsApp del equipo (para "Llamar") ─────────────────────────────────
-- Cada uno carga el suyo en Ajustes. Solo el equipo lo puede leer, y solo a
-- través de estas funciones: office_members sigue sin políticas para el navegador.
alter table public.office_members
  add column if not exists whatsapp text
  check (whatsapp is null or whatsapp ~ '^[0-9]{8,15}$');

create or replace function public.office_directory()
returns table (member text, whatsapp text)
language sql
stable
security definer
set search_path = public
as $$
  select m.member_name, m.whatsapp
  from public.office_members m
  where m.role = 'team'
    and public.is_team_member()
$$;

create or replace function public.set_my_whatsapp(phone text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_team_member() then
    raise exception 'Solo el equipo';
  end if;
  update public.office_members
     set whatsapp = nullif(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), '')
   where email = lower(auth.jwt() ->> 'email');
end
$$;

revoke execute on function public.office_directory(), public.set_my_whatsapp(text) from public, anon;
grant execute on function public.office_directory(), public.set_my_whatsapp(text) to authenticated;

-- ─── 2. Presencia en vivo: canal privado "oficina" ──────────────────────────
-- Quién tiene la app abierta, en qué sala está y su estado elegido a mano.
-- Sin estas políticas el canal privado rechaza a todos (la app sigue
-- funcionando, pero sin presencia).
drop policy if exists oficina_presence_read on realtime.messages;
create policy oficina_presence_read on realtime.messages
  for select to authenticated
  using (realtime.topic() = 'oficina' and public.is_team_member());

drop policy if exists oficina_presence_write on realtime.messages;
create policy oficina_presence_write on realtime.messages
  for insert to authenticated
  with check (realtime.topic() = 'oficina' and public.is_team_member());

commit;

-- ─── Deshacer ───────────────────────────────────────────────────────────────
-- drop policy if exists oficina_presence_read on realtime.messages;
-- drop policy if exists oficina_presence_write on realtime.messages;
-- drop function if exists public.office_directory();
-- drop function if exists public.set_my_whatsapp(text);
-- alter table public.office_members drop column if exists whatsapp;
