-- Fase 0 · Segunda parte: quitar las políticas abiertas que quedaron de antes.
-- Postgres combina las políticas con OR: mientras exista una "using (true)"
-- para anon/public, las políticas de 20261030120000_fase0_seguridad.sql no
-- restringen nada. La service role (MCP, webhook) se salta la RLS.

begin;

-- ─── Proyectos ──────────────────────────────────────────────────────────────
drop policy if exists "Allow anon update" on public.projects;
drop policy if exists "Allow public all access" on public.projects;
drop policy if exists "Allow public insert access" on public.projects;
drop policy if exists "Allow public read access" on public.projects;
drop policy if exists projects_select on public.projects;
drop policy if exists projects_insert on public.projects;
drop policy if exists projects_update on public.projects;
drop policy if exists projects_delete on public.projects;

-- ─── Chat de las salas ──────────────────────────────────────────────────────
drop policy if exists "read" on public.room_messages;
drop policy if exists "insert" on public.room_messages;

-- ─── Retainers (montos por cliente) ─────────────────────────────────────────
drop policy if exists "all" on public.retainers;
drop policy if exists "Allow public read access on retainers" on public.retainers;
drop policy if exists "Allow authenticated users to manage retainers" on public.retainers;

drop policy if exists retainers_team_all on public.retainers;
create policy retainers_team_all on public.retainers
  for all to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

drop policy if exists retainers_client_read on public.retainers;
create policy retainers_client_read on public.retainers
  for select to authenticated
  using (public.office_role() = 'client' and lower(client) = public.office_client_scope());

commit;

-- ─── Deshacer (solo si algo se rompe) ───────────────────────────────────────
-- create policy "Allow public all access" on public.projects
--   for all to anon, authenticated using (true) with check (true);
-- create policy "read" on public.room_messages for select using (true);
-- create policy "insert" on public.room_messages for insert with check (true);
-- create policy "all" on public.retainers for all using (true) with check (true);
