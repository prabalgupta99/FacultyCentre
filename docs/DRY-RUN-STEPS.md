# Dry run: exact steps (each needs his explicit yes; nothing here has been done)

Before: (a) Supabase project shows Active, (b) GitHub secrets set: SUPABASE_URL, SUPABASE_SERVICE_KEY, AI_GATEWAY_API_KEY (the Vercel key, pasted by him straight into GitHub), (c) the package files are on a branch in the FacultyCentre repo (scripts/lib/*, scripts/detect-hiring.ts, tests/decide.test.ts, .github/workflows/daily-hiring-detect.yml) and package.json has the dev dependencies: @playwright/test, cheerio, @supabase/supabase-js, tsx (check what is already there; npm ci needs the lockfile updated).
The dry run does NOT need the migration (it reads colleges only and writes nothing).

1. GitHub, repo FacultyCentre, Actions tab. If the workflow shows disabled, click Enable.
2. Select "Daily Hiring Detection", Run workflow, branch = the branch holding the files, limit = 30, dry_run = true. Run.
3. Expected: unit tests pass, keep-alive curl passes, Detect step prints one line per college "id name -> status (why) http=..." and a final tally and Jev stats (calls, cache hits). Duration about 10 to 20 minutes. Artifact "detect-log" holds the same text.
4. Pass check: no run failure; unknown under 40%; no write errors (there are none in dry run); Jev calls under 2,000. Spot check 10 lines by opening the college pages.
5. Report the log to me (paste it or the artifact) and I compare against the labeled rows and tune thresholds. Only after that, a real small write (dry_run=false, limit=30), which needs the migration first and his separate yes.
Stop signs: any 401/403 from Jev (key or credit problem), Supabase connection errors (project not Active), or tally over 40% unknown.
