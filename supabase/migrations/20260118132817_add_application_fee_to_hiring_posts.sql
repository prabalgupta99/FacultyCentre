-- Add application fee fields to manual_hiring_posts table
ALTER TABLE manual_hiring_posts
ADD COLUMN has_application_fee BOOLEAN DEFAULT FALSE,
ADD COLUMN application_fee TEXT;

-- Add comment for clarity
COMMENT ON COLUMN manual_hiring_posts.has_application_fee IS 'Whether the position has an application fee';
COMMENT ON COLUMN manual_hiring_posts.application_fee IS 'Details about the application fee (e.g., category-wise fees)';
