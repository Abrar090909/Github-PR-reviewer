-- Migration: Add repo_graphs table for baseline graph caching
-- BACKEND_WORKING.md §2.5
--
-- Run this in your Supabase SQL editor or via the Supabase CLI:
--   supabase db push

create table if not exists public.repo_graphs (
  id              uuid primary key default gen_random_uuid(),
  repo_full_name  text not null,
  base_sha        text not null,      -- cache key (repoFullName + baseSHA convention)
  graph_data      jsonb not null,     -- { symbols: ParsedSymbol[] }
  built_at        timestamptz not null default now(),
  created_at      timestamptz not null default now(),

  unique (repo_full_name, base_sha)   -- one cached graph per (repo, sha)
);

-- Keep the table from growing unbounded: drop entries older than 30 days
-- (a cron job or Supabase scheduled function should handle this in production)
-- For now, add an index on built_at to support efficient cleanup queries:
create index if not exists repo_graphs_built_at_idx on public.repo_graphs (built_at);

-- RLS: only the service role (backend) should read/write this table
alter table public.repo_graphs enable row level security;

-- Deny all access to the anon/authenticated role (service role bypasses RLS)
create policy "deny_public" on public.repo_graphs
  for all
  using (false);

-- Grant the service_role full access (Supabase service role bypasses RLS by default,
-- this explicit grant is just for clarity)
grant all on public.repo_graphs to service_role;
