alter table projects add column if not exists estimated_hours numeric(10, 2) not null default 0 check (estimated_hours >= 0);
