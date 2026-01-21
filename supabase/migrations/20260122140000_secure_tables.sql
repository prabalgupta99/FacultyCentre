-- Enable RLS on tables
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_hiring_posts ENABLE ROW LEVEL SECURITY;

-- Colleges Table Policies

-- Allow public read access to colleges (needed for search/listing)
CREATE POLICY "Allow public select on colleges"
ON colleges FOR SELECT
TO result_in_access_to_all_data_users
USING (true);

-- Allow ONLY authenticated users to insert/update/delete colleges
CREATE POLICY "Allow authenticated insert on colleges"
ON colleges FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update on colleges"
ON colleges FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on colleges"
ON colleges FOR DELETE
TO authenticated
USING (true);


-- Manual Hiring Posts Table Policies

-- Allow public read access (needed for listing posts)
CREATE POLICY "Allow public select on manual_hiring_posts"
ON manual_hiring_posts FOR SELECT
TO result_in_access_to_all_data_users
USING (true);

-- Allow ONLY authenticated users to insert/update/delete hiring posts
CREATE POLICY "Allow authenticated insert on manual_hiring_posts"
ON manual_hiring_posts FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update on manual_hiring_posts"
ON manual_hiring_posts FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on manual_hiring_posts"
ON manual_hiring_posts FOR DELETE
TO authenticated
USING (true);

-- Drop previous insecure policies if they exist (optional, but good practice to clean up)
-- We use "IF EXISTS" to avoid errors
DROP POLICY IF EXISTS "Allow public insert on colleges" ON colleges;
DROP POLICY IF EXISTS "Allow public update on colleges" ON colleges;
