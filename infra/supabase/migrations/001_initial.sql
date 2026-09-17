-- Contour Initial Database Migration
-- Run with: pnpm supabase db push

-- ── Installations ─────────────────────────────────────────────────────────────
-- One row per GitHub App installation (account or org)

create table if not exists installations (
  id bigint primary key,                          -- GitHub installation ID
  account_login text not null,                    -- GitHub username or org name
  preferred_provider text default 'anthropic'     -- 'anthropic' | 'gemini' | 'openai'
    check (preferred_provider in ('anthropic', 'gemini', 'openai')),
  sensitivity text default 'balanced'             -- 'strict' | 'balanced' | 'lenient'
    check (sensitivity in ('strict', 'balanced', 'lenient')),
  created_at timestamptz default now() not null
);

comment on table installations is 'GitHub App installations — one row per install';
comment on column installations.id is 'GitHub installation ID (numeric)';
comment on column installations.preferred_provider is 'Which LLM provider to use for analysis';
comment on column installations.sensitivity is 'Risk scoring sensitivity tuning per installation';

-- ── PR Analyses ────────────────────────────────────────────────────────────────
-- One row per unique (repo, commit SHA) — serves as cache + audit log

create table if not exists pr_analyses (
  id uuid primary key default gen_random_uuid(),
  installation_id bigint references installations(id) on delete cascade not null,
  repo_full_name text not null,                   -- 'owner/repo'
  pr_number int not null,
  head_sha text not null,
  graph_document jsonb not null,                  -- GraphDocument JSON (never raw code)
  comment_id bigint,                              -- GitHub comment ID for updates
  created_at timestamptz default now() not null,
  unique (repo_full_name, head_sha)               -- dedup cache key
);

comment on table pr_analyses is 'PR analysis results keyed by (repo, commit SHA)';
comment on column pr_analyses.graph_document is 'Structured JSON output — never raw source code';
comment on column pr_analyses.comment_id is 'GitHub comment ID for PATCH updates (sticky comment)';

create index if not exists pr_analyses_repo_pr_idx
  on pr_analyses (repo_full_name, pr_number);

create index if not exists pr_analyses_installation_idx
  on pr_analyses (installation_id);

-- ── File Hotspots ──────────────────────────────────────────────────────────────
-- Cross-PR churn tracking — the "hotspot memory" differentiator

create table if not exists file_hotspots (
  id uuid primary key default gen_random_uuid(),
  installation_id bigint references installations(id) on delete cascade not null,
  repo_full_name text not null,
  file_path text not null,
  touch_count int default 1 not null,
  last_touched_at timestamptz default now() not null,
  unique (installation_id, repo_full_name, file_path)
);

comment on table file_hotspots is 'Per-file touch frequency for hotspot churn scoring';
comment on column file_hotspots.touch_count is 'How many PRs have touched this file';

create index if not exists file_hotspots_lookup_idx
  on file_hotspots (installation_id, repo_full_name, file_path);

-- ── Row Level Security ─────────────────────────────────────────────────────────
-- Enable RLS — worker uses service role key which bypasses RLS
-- Client-side dashboard uses anon key with read-only access

alter table installations enable row level security;
alter table pr_analyses enable row level security;
alter table file_hotspots enable row level security;

-- Allow service role to do everything (bypasses RLS)
-- Allow no access from anon key (add specific policies if client-side reads needed)
