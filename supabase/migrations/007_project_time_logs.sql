-- Hourly project time tracking (date + hours per log entry).

create table if not exists project_time_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  work_date date not null,
  hours numeric(8, 2) not null check (hours > 0 and hours <= 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_time_logs_project_idx on project_time_logs(project_id);
create index if not exists project_time_logs_project_date_idx on project_time_logs(project_id, work_date);
