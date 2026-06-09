alter table projects drop constraint if exists projects_status_check;
alter table projects add constraint projects_status_check
  check (status in ('in_progress', 'completed', 'canceled', 'archived', 'upcoming'));
