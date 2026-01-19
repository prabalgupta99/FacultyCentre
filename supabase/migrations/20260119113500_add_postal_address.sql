ALTER TABLE manual_hiring_posts
ADD COLUMN has_postal_address BOOLEAN DEFAULT FALSE,
ADD COLUMN postal_address TEXT;
