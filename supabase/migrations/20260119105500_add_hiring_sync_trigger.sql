-- Trigger to update college is_hiring status when manual hiring posts are added, updated, or deleted
-- Created by Google DeepMind Agent to fix manual hiring sync issues

CREATE OR REPLACE FUNCTION update_college_hiring_status()
RETURNS TRIGGER AS $$
DECLARE
  target_college_id BIGINT;
  active_posts_count INTEGER;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    target_college_id := OLD.college_id;
  ELSE
    target_college_id := NEW.college_id;
  END IF;

  -- Check if there are ANY active posts
  SELECT COUNT(*) INTO active_posts_count
  FROM manual_hiring_posts
  WHERE college_id = target_college_id
  AND last_date_to_apply >= CURRENT_DATE;

  -- If active posts exist, force is_hiring to TRUE
  IF active_posts_count > 0 THEN
    UPDATE colleges
    SET is_hiring = TRUE, last_checked = NOW()
    WHERE id = target_college_id;
  END IF;
  
  -- Note: We do NOT set it to FALSE if count is 0, to preserve scraper data.
  -- The scraper job manages setting is_hiring to FALSE when appropriate.
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any (to allow re-application)
DROP TRIGGER IF EXISTS on_hiring_post_change ON manual_hiring_posts;

-- Create Trigger
CREATE TRIGGER on_hiring_post_change
AFTER INSERT OR UPDATE OR DELETE ON manual_hiring_posts
FOR EACH ROW EXECUTE FUNCTION update_college_hiring_status();
