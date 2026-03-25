-- profiles: one per auth user
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  trial_started_at timestamptz default now(),
  subscription_status text default 'trial',  -- trial | active | cancelled | expired
  subscription_tier text default 'free',     -- free | pro
  stripe_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy if not exists "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy if not exists "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy if not exists "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- saved_reports: full report snapshots
create table if not exists public.saved_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  lake_name text not null,
  lake_state text,
  lake_type text,
  trip_date text,                     -- null = "Right Now" report
  filters jsonb default '{}',
  result_data jsonb default '{}',     -- topBaits, topPatterns, sampleSize, coords, water
  summary_data jsonb default '{}',    -- intel, today
  weather_data jsonb,
  pinned boolean default false,
  created_at timestamptz default now()
);

alter table public.saved_reports enable row level security;
create policy if not exists "reports_select_own" on public.saved_reports for select using (auth.uid() = user_id);
create policy if not exists "reports_insert_own" on public.saved_reports for insert with check (auth.uid() = user_id);
create policy if not exists "reports_update_own" on public.saved_reports for update using (auth.uid() = user_id);
create policy if not exists "reports_delete_own" on public.saved_reports for delete using (auth.uid() = user_id);
