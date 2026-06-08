-- fishing_logs: personal trip log entries (the "golf round log" for anglers)
-- Designed for minimal-effort entry: only user_id, lake_name, and trip_date are required.
-- Everything else (conditions, technique, results) is optional so a 5-second log
-- still has value, while a detailed log captures the full picture.

create table if not exists public.fishing_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,

  -- Location
  lake_id uuid references public.body_of_water(id) on delete set null,
  lake_name text not null,
  lake_state text,
  spot text,                          -- optional named spot, e.g. "north riprap near the dam"
  lat double precision,
  lng double precision,

  -- When
  trip_date date not null default current_date,
  time_of_day text,                   -- dawn | morning | midday | afternoon | evening | night

  -- Environment / Conditions
  water_temp_f numeric,
  air_temp_f numeric,
  sky text,                           -- sunny | partly cloudy | overcast | rain
  wind text,                          -- calm | light | moderate | strong (direction optional in free text)
  water_clarity text,                 -- clear | stained | muddy
  water_level text,                   -- low | normal | high | rising | falling

  -- Technique / Pattern
  techniques text[] default '{}',     -- e.g. flipping, dock skipping, drop shot
  baits text[] default '{}',
  structure text[] default '{}',      -- points, docks, grass, riprap, creek channel, standing timber...
  depth text,                         -- free text or range, e.g. "8-12 ft"
  pattern_notes text,

  -- Results
  fish_count integer,
  big_fish_lbs numeric,
  total_weight_lbs numeric,
  rating integer check (rating between 1 and 5),  -- overall trip rating
  notes text,
  photos text[] default '{}',         -- storage URLs (logs bucket)

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists fishing_logs_user_idx on public.fishing_logs (user_id, trip_date desc);
create index if not exists fishing_logs_lake_idx on public.fishing_logs (user_id, lake_name);

alter table public.fishing_logs enable row level security;
drop policy if exists "logs_select_own" on public.fishing_logs;
create policy "logs_select_own" on public.fishing_logs for select using (auth.uid() = user_id);
drop policy if exists "logs_insert_own" on public.fishing_logs;
create policy "logs_insert_own" on public.fishing_logs for insert with check (auth.uid() = user_id);
drop policy if exists "logs_update_own" on public.fishing_logs;
create policy "logs_update_own" on public.fishing_logs for update using (auth.uid() = user_id);
drop policy if exists "logs_delete_own" on public.fishing_logs;
create policy "logs_delete_own" on public.fishing_logs for delete using (auth.uid() = user_id);

-- Storage bucket + RLS for log photos (created via supabase.storage.createBucket — documented here)
-- bucket: log-photos (public read, 5MB limit, image/* mime types)
-- file path convention: log-photos/{user_id}/{filename}
drop policy if exists "log_photos_public_read" on storage.objects;
create policy "log_photos_public_read" on storage.objects for select
  using (bucket_id = 'log-photos');

drop policy if exists "log_photos_user_insert" on storage.objects;
create policy "log_photos_user_insert" on storage.objects for insert
  with check (bucket_id = 'log-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "log_photos_user_update" on storage.objects;
create policy "log_photos_user_update" on storage.objects for update
  using (bucket_id = 'log-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "log_photos_user_delete" on storage.objects;
create policy "log_photos_user_delete" on storage.objects for delete
  using (bucket_id = 'log-photos' and (storage.foldername(name))[1] = auth.uid()::text);
