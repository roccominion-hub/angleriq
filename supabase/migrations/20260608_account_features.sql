-- Account features: welcome-email dedup tracking + user preferences

alter table public.profiles
  add column if not exists welcome_email_sent_at timestamptz,
  add column if not exists home_state text,
  add column if not exists favorite_lakes text[] default '{}',
  add column if not exists preferred_bait_types text[] default '{}',
  add column if not exists fishing_style text,        -- power | finesse | balanced
  add column if not exists boat_access text;          -- boat | kayak | bank
