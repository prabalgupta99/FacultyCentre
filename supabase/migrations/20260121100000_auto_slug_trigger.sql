-- Function to slugify text (handles special chars, spaces, lowercase)
CREATE OR REPLACE FUNCTION slugify(value text)
RETURNS text AS $$
BEGIN
  -- 1. Lowercase
  -- 2. Remove all non-alphanumeric chars (except spaces)
  -- 3. Replace spaces with dashes
  -- 4. Collapse multiple dashes
  -- 5. Trim dashes
  RETURN trim(both '-' from regexp_replace(lower(regexp_replace(value, '[^a-zA-Z0-9\s]', '', 'g')), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Trigger Function to handle slug generation
CREATE OR REPLACE FUNCTION set_college_slug()
RETURNS TRIGGER AS $$
DECLARE
  new_slug text;
  base_slug text;
  counter integer := 1;
BEGIN
  -- Only run if slug is NULL OR name has changed
  IF NEW.slug IS NULL OR (TG_OP = 'UPDATE' AND NEW.college_name_place <> OLD.college_name_place) THEN
    
    -- Generate base slug
    base_slug := slugify(NEW.college_name_place);
    
    -- If slug became empty (e.g. name was "???"), fallback to "college"
    IF base_slug = '' THEN
      base_slug := 'college';
    END IF;

    new_slug := base_slug;

    -- Check for uniqueness loop
    WHILE EXISTS (SELECT 1 FROM colleges WHERE slug = new_slug AND id <> COALESCE(NEW.id, -1)) LOOP
      new_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;

    NEW.slug := new_slug;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to allow re-run
DROP TRIGGER IF EXISTS trigger_set_college_slug ON colleges;

-- Create Trigger
CREATE TRIGGER trigger_set_college_slug
BEFORE INSERT OR UPDATE ON colleges
FOR EACH ROW
EXECUTE FUNCTION set_college_slug();
