-- Cotizador · cotizaciones guardadas por el equipo (vista "Cotizaciones").
-- Solo el equipo (public.is_team_member(), ver fase0_seguridad) lee y escribe.
-- Quién editó y cuándo lo fija el trigger con la sesión, no el navegador.

begin;

create table if not exists public.cotizaciones (
  id              uuid primary key default gen_random_uuid(),
  number          text not null default '',
  client          text not null default '',
  title           text not null default '',
  summary         text not null default '',
  doc             jsonb not null default '{}'::jsonb,   -- la propuesta completa (formato del editor, v: 1)
  created_at      timestamptz not null default now(),
  created_by      uuid,
  created_by_name text,
  updated_at      timestamptz not null default now(),
  updated_by      uuid,
  updated_by_name text
);
create index if not exists cotizaciones_updated_at_idx on public.cotizaciones (updated_at desc);

create or replace function public.cotizaciones_touch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  editor_name text;
begin
  select m.member_name into editor_name
  from public.office_members m
  where m.email = lower(auth.jwt() ->> 'email');

  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  new.updated_by_name := coalesce(editor_name, new.updated_by_name);
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.created_by_name := coalesce(editor_name, new.created_by_name);
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.created_by_name := old.created_by_name;
  end if;
  return new;
end;
$$;
revoke execute on function public.cotizaciones_touch() from anon, authenticated;

drop trigger if exists cotizaciones_touch on public.cotizaciones;
create trigger cotizaciones_touch
  before insert or update on public.cotizaciones
  for each row execute function public.cotizaciones_touch();

alter table public.cotizaciones enable row level security;

drop policy if exists cotizaciones_team_all on public.cotizaciones;
create policy cotizaciones_team_all on public.cotizaciones
  for all to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

-- Tiempo real: la lista se actualiza cuando otro integrante guarda.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cotizaciones'
  ) then
    alter publication supabase_realtime add table public.cotizaciones;
  end if;
end $$;

commit;

-- ─── Deshacer (solo si algo se rompe) ───────────────────────────────────────
-- drop table if exists public.cotizaciones;
-- drop function if exists public.cotizaciones_touch();
