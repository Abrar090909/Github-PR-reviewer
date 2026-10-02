-- Hosted GitHub App lifecycle, durable analyses, and diagram assets.

create table if not exists public.installations (
  id bigint primary key,
  account_login text not null,
  preferred_provider text default 'gemini',
  sensitivity text default 'balanced',
  created_at timestamptz default now() not null
);

create table if not exists public.pr_analyses (
  id uuid primary key default gen_random_uuid(),
  installation_id bigint references public.installations(id) on delete cascade not null,
  repo_full_name text not null,
  pr_number integer not null,
  head_sha text not null,
  graph_document jsonb,
  comment_id bigint,
  created_at timestamptz default now() not null,
  unique (repo_full_name, head_sha)
);

alter table public.installations enable row level security;
alter table public.pr_analyses enable row level security;

alter table public.installations
  add column if not exists account_id bigint,
  add column if not exists account_type text,
  add column if not exists repository_selection text,
  add column if not exists suspended_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.installation_repositories (
  installation_id bigint not null references public.installations(id) on delete cascade,
  repository_id bigint not null,
  repo_full_name text not null,
  private boolean not null default false,
  added_at timestamptz not null default now(),
  primary key (installation_id, repository_id)
);

create index if not exists installation_repositories_name_idx
  on public.installation_repositories (repo_full_name);

alter table public.installation_repositories enable row level security;

alter table public.pr_analyses
  alter column graph_document drop not null,
  add column if not exists repository_id bigint,
  add column if not exists base_sha text,
  add column if not exists status text not null default 'complete'
    check (status in ('processing', 'complete', 'failed', 'stale')),
  add column if not exists error_message text,
  add column if not exists asset_token_hash text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.analysis_assets (
  analysis_id uuid not null references public.pr_analyses(id) on delete cascade,
  asset_id text not null,
  path text not null,
  lens text not null,
  theme text not null,
  view_id text,
  width integer not null,
  height integer not null,
  svg text not null,
  created_at timestamptz not null default now(),
  primary key (analysis_id, asset_id)
);

alter table public.analysis_assets enable row level security;

create index if not exists pr_analyses_installation_repo_pr_idx
  on public.pr_analyses (installation_id, repository_id, pr_number, created_at desc);
