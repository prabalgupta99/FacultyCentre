-- Add slug column (initially nullable)
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Populate existing rows with a slugified version of the name
-- Logic: lowercase, replace special chars with nothing, spaces with dashes, truncate to 100 chars
UPDATE colleges 
SET slug = lower(
    trim(
      regexp_replace(
        regexp_replace(
          substring(college_name_place from 1 for 100), 
          '[^a-zA-Z0-9\s-]', '', 'g' 
        ),
        '\s+', '-', 'g'
      )
    )
)
WHERE slug IS NULL;

-- Now enforce NOT NULL
ALTER TABLE colleges ALTER COLUMN slug SET NOT NULL;
