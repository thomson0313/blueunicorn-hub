-- Structured project budget: type, currency, amount; budget column holds display label.

alter table projects add column if not exists budget_type text not null default 'fixed';
alter table projects add column if not exists budget_currency text not null default 'USD';
alter table projects add column if not exists budget_amount text not null default '';

alter table projects drop constraint if exists projects_budget_type_check;
alter table projects add constraint projects_budget_type_check
  check (budget_type in ('hourly', 'fixed'));
