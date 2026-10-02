# Rollout order and fallback

Order (each line is his explicit yes; nothing runs before it):
1. Restore Supabase project (free plan). Site data comes back; this alone makes the site work.
2. Run docs/PRE-MIGRATION-CHECK.sql (read only), then apply the migration.
3. Jev key (or Vercel AI Gateway key) saved as GitHub secret TYPESAFE_API_KEY; also SUPABASE_URL, SUPABASE_SERVICE_KEY, GOOGLE_SHEET_CSV_URL if the sync step is wanted.
4. Push a branch with this package (scripts, tests, workflow, migration) and the site diff. Enable the workflow (Actions tab).
5. Manual dry run (30), then real small run, then full run, then keep the daily schedule.
6. Vercel preview of the site, then production.

Fallback if the detector is not ready by Mon 5 Oct 5 PM:
- After step 1 only: site works with restored data. Apply only the hiring filter from site/site-changes.diff plus the migration (unknown for all). Default view would then show nothing because nothing is verified, so for the demo use the interim option below.
- Interim option: set hiring_status = 'hiring' only for the colleges verified by hand (we have Nirma Institute of Law, BHU Faculty of Law, Christ School of Law from public pages on 2 Oct; each needs a last check before the interview). The map is then small and every pin is true. Say so plainly: verified sample, detector rolling out.
- Keep-alive: add the one-line curl step to any workflow so the free project does not pause again (the draft workflow has it).
