-- DRAFT. Not applied. Adds the three-state hiring status, per-college evidence and law-stream marker.
-- Before applying: run the read-only check in docs/PRE-MIGRATION-CHECK.sql and compare the live trigger body.
ALTER TABLE colleges
  ADD COLUMN IF NOT EXISTS hiring_status text NOT NULL DEFAULT 'unknown'
    CHECK (hiring_status IN ('hiring','not_hiring','unknown')),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS evidence_title text,
  ADD COLUMN IF NOT EXISTS evidence_url text,
  ADD COLUMN IF NOT EXISTS evidence_json jsonb,
  ADD COLUMN IF NOT EXISTS open_streams text[] NOT NULL DEFAULT '{}';

-- Existing is_hiring=true flags came from the old keyword logic. Mark them unverified so the site does not trust them:
-- the new default view shows only hiring_status = 'hiring', which only the new detector (or an active manual post) sets.
UPDATE colleges SET hiring_status = 'unknown' WHERE hiring_status IS NULL OR hiring_status = 'unknown';

-- Manual hiring posts still force 'hiring' (admin knowledge beats the detector). Keeps the existing trigger's behaviour.
CREATE OR REPLACE FUNCTION update_college_hiring_status() RETURNS TRIGGER AS $$
DECLARE target_college_id BIGINT; active_posts_count INTEGER;
BEGIN
  IF (TG_OP = 'DELETE') THEN target_college_id := OLD.college_id; ELSE target_college_id := NEW.college_id; END IF;
  SELECT COUNT(*) INTO active_posts_count FROM manual_hiring_posts
   WHERE college_id = target_college_id AND last_date_to_apply >= CURRENT_DATE;
  IF active_posts_count > 0 THEN
    UPDATE colleges SET is_hiring = TRUE, hiring_status = 'hiring', last_checked = NOW() WHERE id = target_college_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS colleges_hiring_status_idx ON colleges (hiring_status);
-- ROLLBACK: ALTER TABLE colleges DROP COLUMN hiring_status, DROP COLUMN verified_at, DROP COLUMN evidence_title, DROP COLUMN evidence_url, DROP COLUMN evidence_json, DROP COLUMN open_streams;
