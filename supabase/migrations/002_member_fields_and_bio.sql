-- Run in Supabase SQL Editor if you already applied schema.sql.

create table if not exists member_fields (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into member_fields (name, sort_order) values
  ('AI club', 1),
  ('Scandicommerce', 2),
  ('Online Business', 3)
on conflict (name) do nothing;

alter table users add column if not exists field_id uuid references member_fields(id);
alter table users add column if not exists bio text not null default '';

-- Migrate plan -> bio if old column exists
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'users' and column_name = 'plan'
  ) then
    update users set bio = plan where bio = '' and plan is not null and plan <> '';
    alter table users drop column plan;
  end if;
end $$;

create table if not exists password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists password_resets_token_idx on password_resets(token);
