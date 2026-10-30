-- Fase 0 · Seguridad de la oficina / salas de voz
-- Aplicar en Supabase → SQL Editor (revisar antes). Ver docs/oficina/fase-0.md.
-- La service role (ruta MCP, webhook) se salta la RLS: no se ve afectada.

begin;

-- ─── 1. Quién es quién (lista blanca para RLS) ──────────────────────────────
-- Debe coincidir con MEMBER_BY_EMAIL en src/constants/team.js.
create table if not exists public.office_members (
  email        text primary key,
  member_name  text not null,
  role         text not null default 'team' check (role in ('team', 'client')),
  client_scope text            -- para role = 'client': cliente al que se limita (en minúsculas)
);
alter table public.office_members enable row level security;
-- Sin políticas: el navegador no la puede leer ni escribir; solo SQL / service role.

insert into public.office_members (email, member_name, role, client_scope) values
  ('hola@cerezoperu.com',         'Marcelo',   'team',   null),
  ('mauriciomu22ts@gmail.com',    'Mauricio',  'team',   null),
  ('edsonlom321@gmail.com',       'Edson',     'team',   null),
  ('luis.matallana.30@gmail.com', 'Luis',      'team',   null),
  ('francisco@carbonomkt.com',    'Francisco', 'client', 'carbono')
on conflict (email) do update
  set member_name = excluded.member_name,
      role = excluded.role,
      client_scope = excluded.client_scope;

-- Rol de quien hace la consulta (null si no está en la lista o es anónimo).
create or replace function public.office_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.office_members m
  where m.email = lower(auth.jwt() ->> 'email')
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
$$;

create or replace function public.office_client_scope()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.client_scope
  from public.office_members m
  where m.email = lower(auth.jwt() ->> 'email')
    and m.role = 'client'
$$;

create or replace function public.is_team_member()
returns boolean
language sql
stable
as $$ select coalesce(public.office_role() = 'team', false) $$;

revoke execute on function public.office_role(), public.office_client_scope(), public.is_team_member() from anon;

-- ─── 2. Chat de las salas (room_messages) ───────────────────────────────────
-- Antes el navegador ponía sender_identity a mano: cualquiera podía escribir
-- como otra persona. Ahora el remitente es el usuario de la sesión.
alter table public.room_messages enable row level security;
alter table public.room_messages add column if not exists sender_id uuid default auth.uid();

drop policy if exists room_messages_select_team on public.room_messages;
create policy room_messages_select_team on public.room_messages
  for select to authenticated
  using (public.is_team_member());

drop policy if exists room_messages_insert_self on public.room_messages;
create policy room_messages_insert_self on public.room_messages
  for insert to authenticated
  with check (
    public.is_team_member()
    and sender_id = auth.uid()
    and lower(sender_identity) = lower(auth.jwt() ->> 'email')
  );
-- Sin políticas de update/delete: los mensajes no se editan ni se borran desde la app.

-- ─── 3. Proyectos ───────────────────────────────────────────────────────────
-- Hoy la clave pública (anon) puede leer todos los proyectos sin iniciar
-- sesión, y Francisco solo está filtrado en la pantalla.
alter table public.projects enable row level security;

drop policy if exists projects_team_all on public.projects;
create policy projects_team_all on public.projects
  for all to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

drop policy if exists projects_client_scope on public.projects;
create policy projects_client_scope on public.projects
  for all to authenticated
  using (
    public.office_role() = 'client'
    and (lower(client) = public.office_client_scope()
         or lower(properties ->> 'tag') = public.office_client_scope())
  )
  with check (
    public.office_role() = 'client'
    and (lower(client) = public.office_client_scope()
         or lower(properties ->> 'tag') = public.office_client_scope())
  );

-- ─── 4. Uso de las salas (webhook de LiveKit) ───────────────────────────────
create table if not exists public.office_room_events (
  id          bigint generated always as identity primary key,
  event_id    text not null unique,      -- id del webhook: evita duplicados en reintentos
  event       text not null,             -- participant_joined | participant_left | room_finished
  room        text,
  user_id     text,                      -- parte de usuario de la identidad de LiveKit
  member      text,                      -- nombre del integrante (sin email)
  occurred_at timestamptz not null default now()
);
create index if not exists office_room_events_occurred_at_idx on public.office_room_events (occurred_at);
alter table public.office_room_events enable row level security;

drop policy if exists office_room_events_select_team on public.office_room_events;
create policy office_room_events_select_team on public.office_room_events
  for select to authenticated
  using (public.is_team_member());
-- Escritura: solo el webhook (service role).

commit;

-- ─── Deshacer (solo si algo se rompe) ───────────────────────────────────────
-- alter table public.projects disable row level security;
-- alter table public.room_messages disable row level security;
-- drop policy if exists projects_team_all on public.projects;
-- drop policy if exists projects_client_scope on public.projects;
