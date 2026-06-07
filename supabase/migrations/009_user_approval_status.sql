-- Member registration requires admin approval before login.

alter table users add column if not exists approval_status text not null default 'pending'
  check (approval_status in ('pending', 'accepted', 'rejected'));

update users set approval_status = 'accepted' where approval_status = 'pending';
update users set approval_status = 'accepted' where role = 'admin';
