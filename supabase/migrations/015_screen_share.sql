create table if not exists screen_share_sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references users(id) on delete cascade,
  host_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz
);

create unique index if not exists screen_share_one_active_idx
  on screen_share_sessions (active)
  where active = true;

create table if not exists screen_share_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references screen_share_sessions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  user_name text not null,
  status text not null check (status in ('pending', 'viewer')),
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create index if not exists screen_share_participants_session_idx
  on screen_share_participants (session_id);

create table if not exists screen_share_signals (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references screen_share_sessions(id) on delete cascade,
  to_user_id uuid not null references users(id) on delete cascade,
  from_user_id uuid not null references users(id) on delete cascade,
  signal_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists screen_share_signals_to_created_idx
  on screen_share_signals (to_user_id, created_at);
