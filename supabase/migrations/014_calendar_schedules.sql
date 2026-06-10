create table if not exists calendar_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  type text not null check (type in ('interview', 'event')),
  description text not null default '',
  meeting_link text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_schedules_user_idx on calendar_schedules(user_id);
create index if not exists calendar_schedules_starts_idx on calendar_schedules(starts_at);
create index if not exists calendar_schedules_range_idx on calendar_schedules(starts_at, ends_at);
