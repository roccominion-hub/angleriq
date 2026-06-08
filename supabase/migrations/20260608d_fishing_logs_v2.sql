-- fishing_logs v2: support multi-select Time of Day & Depth, multiple Big Fish
-- entries, and an optional per-catch breakdown (individual catches sub-log).

-- Time of Day: was a single value, now multi-select (e.g. an angler may fish
-- both morning and evening in one trip).
alter table public.fishing_logs
  alter column time_of_day drop default;
alter table public.fishing_logs
  alter column time_of_day type text[] using case when time_of_day is null or time_of_day = '' then '{}'::text[] else array[time_of_day] end;
alter table public.fishing_logs
  alter column time_of_day set default '{}';

-- Depth: was free text, now multi-select from common depth-range chips (still
-- stored as an array of strings so custom ranges remain possible later).
alter table public.fishing_logs
  alter column depth drop default;
alter table public.fishing_logs
  alter column depth type text[] using case when depth is null or depth = '' then '{}'::text[] else array[depth] end;
alter table public.fishing_logs
  alter column depth set default '{}';

-- Big Fish: allow multiple entries (e.g. a 6.2 and a 5.8 on the same trip).
-- big_fish_lbs remains the single "best fish" value (max of entries) for
-- existing aggregates/queries; big_fish_entries holds the full list.
alter table public.fishing_logs
  add column if not exists big_fish_entries numeric[] default '{}';

-- Individual catches: optional repeatable sub-log — each entry can capture
-- weight, length, bait, technique, time, and notes for a single fish.
alter table public.fishing_logs
  add column if not exists catches jsonb default '[]'::jsonb;
