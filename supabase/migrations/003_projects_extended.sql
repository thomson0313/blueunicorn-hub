-- Run in Supabase SQL Editor if projects table already exists.

alter table projects add column if not exists field_id uuid references member_fields(id);
alter table projects add column if not exists budget text not null default '';
alter table projects add column if not exists timeline text not null default '';

update projects set status = 'in_progress' where status in ('not_started', 'on_hold');

alter table projects drop constraint if exists projects_status_check;
alter table projects add constraint projects_status_check
  check (status in ('in_progress', 'completed', 'canceled', 'archived'));

create index if not exists projects_field_idx on projects(field_id);
create index if not exists projects_status_idx on projects(status);
