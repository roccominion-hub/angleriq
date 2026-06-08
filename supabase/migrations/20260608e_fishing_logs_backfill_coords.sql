-- Backfill lat/lng on existing fishing_logs rows from their linked lake.
-- The original LogEntryForm never sent lat/lng on save (a bug — this is what
-- caused "lake badges with counts are not displaying on the map"), so early
-- logged trips have lake_id but null coordinates. New saves now include
-- lat/lng directly from the selected lake.
update public.fishing_logs f
set lat = b.lat, lng = b.lng
from public.body_of_water b
where f.lake_id = b.id and f.lat is null and b.lat is not null;
