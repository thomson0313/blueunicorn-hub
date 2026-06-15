-- Enhanced chat: custom channels, attachments, reactions, replies, read cursors.

create table if not exists chat_channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  visibility text not null check (visibility in ('public', 'private')),
  created_by uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_channel_members (
  channel_id uuid not null references chat_channels(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create index if not exists chat_channel_members_user_idx on chat_channel_members(user_id);

alter table messages drop constraint if exists messages_channel_type_check;
alter table messages add column if not exists channel_id uuid references chat_channels(id) on delete cascade;
alter table messages add column if not exists parent_id uuid references messages(id) on delete set null;
alter table messages add column if not exists edited_at timestamptz;
alter table messages add column if not exists deleted_at timestamptz;

alter table messages add constraint messages_channel_type_check
  check (channel_type in ('general', 'dm', 'channel'));

create index if not exists messages_custom_channel_idx on messages(channel_id, created_at);

create table if not exists message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists message_attachments_message_idx on message_attachments(message_id);

create table if not exists message_reactions (
  message_id uuid not null references messages(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table if not exists conversation_read_cursors (
  user_id uuid not null references users(id) on delete cascade,
  conversation_key text not null,
  last_read_at timestamptz not null default now(),
  primary key (user_id, conversation_key)
);

create index if not exists conversation_read_cursors_key_idx on conversation_read_cursors(conversation_key);
