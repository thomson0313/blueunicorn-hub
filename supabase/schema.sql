-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  username text unique,
  password_hash text not null,
  role text not null check (role in ('admin', 'member')),
  avatar_url text,
  skills text not null default '',
  plan text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references users(id) on delete cascade,
  title text not null,
  description text not null default '',
  completion_rate integer not null default 0 check (completion_rate >= 0 and completion_rate <= 100),
  status text not null default 'in_progress'
    check (status in ('not_started', 'in_progress', 'completed', 'on_hold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_idx on projects(owner);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references users(id) on delete cascade,
  channel_type text not null check (channel_type in ('general', 'dm')),
  recipient uuid references users(id) on delete cascade,
  dm_key text,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists messages_general_idx on messages(channel_type, created_at);
create index if not exists messages_dm_idx on messages(dm_key, created_at);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references users(id) on delete cascade,
  title text not null,
  content text not null,
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'delivered')),
  delivered_at timestamptz,
  seen_by uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists alerts_status_scheduled_idx on alerts(status, scheduled_at);
create index if not exists alerts_delivered_idx on alerts(delivered_at);

create table if not exists presence (
  user_id uuid primary key references users(id) on delete cascade,
  last_seen timestamptz not null default now()
);

create index if not exists presence_last_seen_idx on presence(last_seen);

-- Public bucket for profile avatars.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;
