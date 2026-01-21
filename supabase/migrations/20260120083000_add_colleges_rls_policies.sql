-- Allow public INSERT on colleges table for admin dashboard
-- Since the admin hiring manager is a public-facing tool (no auth yet),
-- we need to allow anonymous inserts

-- First, ensure RLS is enabled (it likely already is)
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow anyone to insert new colleges
-- (In production, you'd want to restrict this to authenticated admin users)
CREATE POLICY "Allow public insert on colleges"
ON colleges
FOR INSERT
WITH CHECK (true);

-- Also ensure SELECT is allowed (for searching colleges)
CREATE POLICY "Allow public select on colleges"
ON colleges
FOR SELECT
USING (true);

-- Also ensure UPDATE is allowed (for updating is_hiring flag)
CREATE POLICY "Allow public update on colleges"
ON colleges
FOR UPDATE
USING (true)
WITH CHECK (true);
