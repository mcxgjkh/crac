-- 登录历史表
create table if not exists login_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  ip_address text,
  logged_at timestamptz default now()
);

alter table login_logs enable row level security;

create policy "用户只能查看自己的登录记录"
  on login_logs for select
  using ( auth.uid() = user_id );

create policy "用户可新增自己的登录记录"
  on login_logs for insert
  with check ( auth.uid() = user_id );
