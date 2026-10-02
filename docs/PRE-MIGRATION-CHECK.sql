-- READ ONLY. Run in the Supabase SQL editor after restore, before applying the migration.
SELECT pg_get_functiondef(p.oid) FROM pg_proc p WHERE proname = 'update_college_hiring_status';  -- compare with the draft body
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'colleges' ORDER BY ordinal_position; -- confirm last_checked, error_log exist
SELECT count(*) AS colleges, count(*) FILTER (WHERE is_hiring) AS flagged_hiring, count(*) FILTER (WHERE career_page_url IS NOT NULL) AS with_career_url FROM colleges;
