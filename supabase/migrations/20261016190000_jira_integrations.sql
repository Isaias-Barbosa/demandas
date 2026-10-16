create table public.jira_integrations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  config jsonb not null,
  token_encrypted text not null,
  display_name text,
  updated_at timestamptz not null default now()
);
alter table public.jira_integrations enable row level security;
create policy "Own Jira integration" on public.jira_integrations
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
revoke all on public.jira_integrations from anon;
grant select, insert, update, delete on public.jira_integrations to authenticated;
