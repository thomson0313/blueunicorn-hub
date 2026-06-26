-- Per-user DM conversation hide (delete chat for me only).

create table if not exists user_conversation_state (
  user_id uuid not null references users(id) on delete cascade,
  conversation_key text not null,
  hidden_at timestamptz not null default now(),
  primary key (user_id, conversation_key)
);

create index if not exists user_conversation_state_key_idx on user_conversation_state(conversation_key);
