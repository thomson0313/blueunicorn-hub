-- One time log entry per project per day.

delete from project_time_logs a
using project_time_logs b
where a.project_id = b.project_id
  and a.work_date = b.work_date
  and a.created_at < b.created_at;

create unique index if not exists project_time_logs_project_date_uidx
  on project_time_logs(project_id, work_date);
