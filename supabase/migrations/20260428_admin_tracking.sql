-- Admin tracking: add report usage counter and last active timestamp to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS reports_run int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

-- Atomic increment function called from /api/summary on each non-cached report
CREATE OR REPLACE FUNCTION increment_user_reports(uid uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE profiles
  SET reports_run = reports_run + 1,
      last_active_at = now()
  WHERE id = uid;
$$;
