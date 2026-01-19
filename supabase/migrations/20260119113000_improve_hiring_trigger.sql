-- Add scraped_is_hiring column to distinguish between scraper and manual status
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS scraped_is_hiring BOOLEAN DEFAULT FALSE;

-- Seed the column (safest assumption is valid scraper data, but we can't be sure for all. Defaulting to is_hiring is reasonable for migration)
UPDATE colleges SET scraped_is_hiring = is_hiring WHERE scraped_is_hiring IS NULL;

-- Improved Trigger Function (OR Logic)
CREATE OR REPLACE FUNCTION update_college_hiring_status()
RETURNS TRIGGER AS $$
DECLARE
  target_college_id BIGINT;
  active_posts_count INTEGER;
  scraped_status BOOLEAN;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    target_college_id := OLD.college_id;
  ELSE
    target_college_id := NEW.college_id;
  END IF;

  -- Active Manual Posts
  SELECT COUNT(*) INTO active_posts_count
  FROM manual_hiring_posts
  WHERE college_id = target_college_id
  AND last_date_to_apply >= CURRENT_DATE;

  -- Get Scraped Status
  SELECT COALESCE(scraped_is_hiring, FALSE) INTO scraped_status
  FROM colleges
  WHERE id = target_college_id;
  
  -- Update logic: College is hiring IF scraper says so OR manual posts exist
  UPDATE colleges
  SET is_hiring = (scraped_status OR active_posts_count > 0),
      last_checked = NOW()
  WHERE id = target_college_id;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply Trigger (Drop to be safe)
DROP TRIGGER IF EXISTS on_hiring_post_change ON manual_hiring_posts;

CREATE TRIGGER on_hiring_post_change
AFTER INSERT OR UPDATE OR DELETE ON manual_hiring_posts
FOR EACH ROW EXECUTE FUNCTION update_college_hiring_status();
