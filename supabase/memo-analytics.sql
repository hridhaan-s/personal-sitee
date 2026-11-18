-- Memo analytics storage
-- The table is deliberately inaccessible to anon/authenticated clients.
-- All reads and writes go through api/memo-analytics.js using a server-only key.

create table if not exists public.memo_analytics_events (
  id bigint generated always as identity primary key,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  event_type text not null check (event_type in ('page_view', 'reading_progress', 'reading_time')),
  visitor_id text not null check (length(visitor_id) between 16 and 80),
  session_id text not null check (length(session_id) between 16 and 80),
  referrer_host text,
  device_type text not null default 'unknown' check (device_type in ('desktop', 'mobile', 'tablet', 'unknown')),
  progress integer check (progress is null or progress in (25, 50, 75, 100)),
  duration_seconds integer check (duration_seconds is null or duration_seconds between 0 and 86400),
  created_at timestamptz not null default now()
);

create index if not exists memo_analytics_events_created_at_idx
  on public.memo_analytics_events (created_at desc);
create index if not exists memo_analytics_events_slug_created_at_idx
  on public.memo_analytics_events (slug, created_at desc);
create index if not exists memo_analytics_events_visitor_created_at_idx
  on public.memo_analytics_events (visitor_id, created_at desc);

alter table public.memo_analytics_events enable row level security;
revoke all on table public.memo_analytics_events from anon, authenticated;
grant all on table public.memo_analytics_events to service_role;
grant usage, select on sequence public.memo_analytics_events_id_seq to service_role;
