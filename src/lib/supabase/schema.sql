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
  welcome_email_sent_at timestamptz,         -- set once welcome email is sent — prevents dupes/misses on delayed email confirmation
  home_state text,                           -- preferences (added 20260608_account_features.sql)
  favorite_lakes text[] default '{}',
  preferred_bait_types text[] default '{}',
  fishing_style text,                        -- power | finesse | balanced
  boat_access text,                          -- boat | kayak | bank
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

-- fishing_logs: personal trip log entries — "golf round log" for anglers.
-- Only user_id, lake_name, trip_date are required; everything else (conditions,
-- technique, results) is optional so a quick log still has value.
-- See supabase/migrations/20260608c_fishing_logs.sql for full DDL + RLS + storage policies.
create table if not exists public.fishing_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  -- Location
  lake_id uuid references public.body_of_water(id) on delete set null,
  lake_name text not null,
  lake_state text,
  spot text,
  lat double precision,
  lng double precision,
  -- When
  trip_date date not null default current_date,
  time_of_day text,                   -- dawn | morning | midday | afternoon | evening | night
  -- Environment / Conditions
  water_temp_f numeric,
  air_temp_f numeric,
  sky text,                           -- sunny | partly cloudy | overcast | rain
  wind text,                          -- calm | light | moderate | strong
  water_clarity text,                 -- clear | stained | muddy
  water_level text,                   -- low | normal | high | rising | falling
  -- Technique / Pattern
  techniques text[] default '{}',
  baits text[] default '{}',
  structure text[] default '{}',
  depth text,
  pattern_notes text,
  -- Results
  fish_count integer,
  big_fish_lbs numeric,
  total_weight_lbs numeric,
  rating integer check (rating between 1 and 5),
  notes text,
  photos text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.fishing_logs enable row level security;
