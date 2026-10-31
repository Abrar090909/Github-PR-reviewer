-- Review findings for each analysis, so the review page can show them and a
-- later push can link findings already posted instead of repeating them.
alter table public.pr_analyses
  add column if not exists review jsonb;
