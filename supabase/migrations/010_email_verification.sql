-- Email verification required before using the platform.

alter table users add column if not exists email_verified_at timestamptz;

update users set email_verified_at = now() where email_verified_at is null;

create table if not exists email_verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists email_verification_codes_user_idx on email_verification_codes(user_id);
