# End-to-end test plan (nothing here touches his accounts until the stated step)

Stage | What runs | Needs from him | Pass rule
--- | --- | --- | ---
0. Logic tests (done, offline) | `npx tsx --test tests/decide.test.ts` : 12 tests of the decision rules and date finding | nothing | 12/12 pass (they do)
1. Plumbing on the 50 saved pages (done, offline, mock) | `JEV_MOCK=1 npx tsx scripts/eval-saved.ts <pages> labeling/labeled_set_50.csv` | nothing | runs end to end, writes eval-report.json. Mock is a crude stand-in; its accuracy means nothing
2. Real Jev on the 50 saved pages | same command with a real key (TYPESAFE_API_KEY, or an AI Gateway key plus JEV_ENDPOINT) | an API key via vault link or secret (never chat) | Compare old vs new on the labeled rows. Target: new correct on at least 10 of the 14 confident rows and catches 2 of 3 open-law rows; no row hiring when label is no. Cost about 1 to 2 rupees
3. Tune | adjust MIN_CONFIDENCE / MIN_NOUL in questions.ts using stage 2 output; rerun | same key | Fewer wrong answers; unknown is allowed, wrong is not
4. Dry run on live pages, 30 colleges | Actions, workflow_dispatch limit=30 dry_run=true (Playwright renders the real pages) | Supabase restored, secrets set (SUPABASE_URL, SUPABASE_SERVICE_KEY, TYPESAFE_API_KEY), workflow enabled, migration applied | Log shows a status per college, no DB writes; unknown under 40%; spot check 10 by hand
5. Small real write | same, dry_run=false, limit=30 | his go | hiring_status/evidence columns filled; rest stays unknown
6. Site check | deploy the site diff to a Vercel preview (not production) | his go to push a branch | Default view shows only verified law-hiring pins, count matches DB; "Not verified" filter lists the rest; evidence link opens the notice
7. Full run, then daily schedule | limit blank, then enable cron | his go | Tally in log; hiring count plausible (expect low tens, not 100+)
8. Hand label check | he or I check 10 hiring and 10 not_hiring rows live | none | At least 18 of 20 agree

Known limits: pages that load lists by script need the rendered run (stage 4); PDF-only notices stay unknown; sites that block bots stay unknown; only 3 confident open-law examples exist so recall is a rough guess until stage 8.
