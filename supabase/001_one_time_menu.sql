-- ==========================================================
-- OneTime Menu - MVP Supabase Schema
-- One table, one JSONB row per restaurant/menu instance.
-- Run this entire file once in Supabase SQL Editor.
-- ==========================================================

create table if not exists public.one_time_menu_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- The browser app uses the public/publishable Supabase key.
-- For this MVP there is intentionally no login yet, so the
-- anonymous role can read and modify menu state.
--
-- IMPORTANT: This is appropriate for a prototype/demo only.
-- Add Supabase Auth and authenticated write policies before
-- using this for real restaurant customers.

alter table public.one_time_menu_state enable row level security;

revoke all on table public.one_time_menu_state from anon, authenticated;
grant select, insert, update on table public.one_time_menu_state to anon, authenticated;

-- Drop/recreate policies so the script can safely be rerun.
drop policy if exists "OneTime Menu public read" on public.one_time_menu_state;
drop policy if exists "OneTime Menu public insert" on public.one_time_menu_state;
drop policy if exists "OneTime Menu public update" on public.one_time_menu_state;

create policy "OneTime Menu public read"
on public.one_time_menu_state
for select
to anon, authenticated
using (true);

create policy "OneTime Menu public insert"
on public.one_time_menu_state
for insert
to anon, authenticated
with check (true);

create policy "OneTime Menu public update"
on public.one_time_menu_state
for update
to anon, authenticated
using (true)
with check (true);

-- Enable simple Postgres Changes realtime for this table.
-- Supabase may already have this publication, so only add the
-- table if it is not already included.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'one_time_menu_state'
  ) then
    execute 'alter publication supabase_realtime add table public.one_time_menu_state';
  end if;
end
$$;
