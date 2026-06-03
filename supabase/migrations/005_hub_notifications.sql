create table if not exists hub_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('project_update', 'comment')),
  title text not null,
  body text not null default '',
  project_id uuid references projects(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists hub_notifications_user_idx on hub_notifications(user_id, created_at desc);
create index if not exists hub_notifications_unread_idx on hub_notifications(user_id) where read_at is null;
