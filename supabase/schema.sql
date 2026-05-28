-- TaskHI schema — run this to create all tables from scratch
-- Or run the MIGRATION section at the bottom if you already ran this once

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  avatar_url text,
  avatar_color text default '#6366f1',
  created_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text default '',
  color text default 'indigo',
  icon text,
  status text default 'active',
  board_columns jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  position integer default 0,
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  section_id uuid references sections(id) on delete set null,
  parent_task_id uuid references tasks(id) on delete cascade,
  title text not null,
  description text default '',
  notes text default '',
  status text default 'todo',
  priority text default 'medium',
  due_date date,
  created_by uuid not null default auth.uid() references profiles(id),
  assignee_id uuid references profiles(id),
  position integer default 0,
  depth integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table projects enable row level security;
alter table sections enable row level security;
alter table tasks enable row level security;

-- RLS Policies
drop policy if exists "profiles_own" on profiles;
create policy "profiles_own" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "projects_own" on projects;
create policy "projects_own" on projects for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "sections_own" on sections;
create policy "sections_own" on sections for all using (
  exists (select 1 from projects where projects.id = sections.project_id and projects.owner_id = auth.uid())
);

drop policy if exists "tasks_own" on tasks;
create policy "tasks_own" on tasks for all using (
  exists (select 1 from projects where projects.id = tasks.project_id and projects.owner_id = auth.uid())
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Grant permissions so authenticated users can read AND write
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant select on all tables in schema public to anon;

-- -----------------------------------------------
-- MIGRATION: run these if you already ran the schema above
-- -----------------------------------------------
alter table tasks add column if not exists notes text default '';
alter table tasks alter column created_by set default auth.uid();
alter table tasks add column if not exists parent_task_id uuid references tasks(id) on delete cascade;
alter table tasks add column if not exists depth integer default 0;

-- Fix missing write permissions (run this if starring / editing doesn't persist)
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
