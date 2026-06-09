-- Two-factor authentication (TOTP), trusted devices, and login device tracking.

alter table users add column if not exists totp_secret text;
alter table users add column if not exists totp_enabled_at timestamptz;

create table if not exists user_known_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  device_hash text not null,
  browser text not null default '',
  os text not null default '',
  last_ip text not null default '',
  last_country text not null default '',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(user_id, device_hash)
);

create index if not exists user_known_devices_user_idx on user_known_devices(user_id);

create table if not exists trusted_2fa_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  device_hash text not null,
  device_label text not null default '',
  browser text not null default '',
  os text not null default '',
  trusted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique(user_id, device_hash)
);

create index if not exists trusted_2fa_devices_user_idx on trusted_2fa_devices(user_id);
