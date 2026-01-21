-- Clean slate: drop if exists (safe since not in use yet)
ALTER TABLE colleges DROP COLUMN IF EXISTS slug;

-- Add column
ALTER TABLE colleges ADD COLUMN slug text UNIQUE;

-- Populate
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
) || '-' || id::text;

-- Enforce Not Null
ALTER TABLE colleges ALTER COLUMN slug SET NOT NULL;
