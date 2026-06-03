alter table projects add column if not exists preview_link text not null default '';
alter table projects add column if not exists github_link text not null default '';

create table if not exists project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  parent_id uuid references project_comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_comments_project_idx on project_comments(project_id);
create index if not exists project_comments_parent_idx on project_comments(parent_id);

create table if not exists project_comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references project_comments(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (comment_id, user_id, emoji)
);

create index if not exists project_comment_reactions_comment_idx on project_comment_reactions(comment_id);
