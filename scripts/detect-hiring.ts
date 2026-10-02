/**
 * Hiring detector (Jev, per notice). DRAFT: not committed, not run against any account.
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, TYPESAFE_API_KEY (or JEV_MOCK=1 for an offline plumbing test).
 * Flags: --dry-run (no DB writes), --limit N, --ids 1,2,3
 */
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { extractNotices, prefilter, pageReadable, type Notice } from './lib/extract';
import { decide, type Judged, type Status } from './lib/decide';
import { judge, saveCache, stats } from './lib/jev';

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : undefined; };
const DRY = process.argv.includes('--dry-run');
const LIMIT = Number(arg('--limit')) || Infinity;
const IDS = arg('--ids')?.split(',').map(Number);
const TODAY = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD, India date
const MAX_NOTICES = 40;
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function main() {
  let q = supabase.from('colleges').select('id, college_name_place, career_page_url').not('career_page_url', 'is', null);
  if (IDS) q = q.in('id', IDS);
  const { data: colleges, error } = await q;
  if (error) throw error;
  const browser = await chromium.launch();
  const tally: Record<string, number> = {}; let done = 0; const pageCache = new Map<string, { http: number | null; html: string }>();
  for (const c of (colleges ?? []).slice(0, LIMIT)) {
    let status: Status = 'unknown', why = '', ev: Notice | undefined, answers: any, role: string | undefined, http: number | null = null, err: string | null = null;
    try {
      const page = await browser.newPage();
      const cached = pageCache.get(c.career_page_url);
      let html: string;
      if (cached) { http = cached.http; html = cached.html; } else {
        const resp = await page.goto(c.career_page_url, { waitUntil: 'domcontentloaded', timeout: 40000 });
        http = resp?.status() ?? null;
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        html = await page.content(); pageCache.set(c.career_page_url, { http, html });
      }
      await page.close();
      const readable = pageReadable(http, html);
      const notices = readable ? extractNotices(html, c.career_page_url).filter(prefilter).slice(0, MAX_NOTICES) : [];
      const judged: Judged[] = [];
      for (const n of notices) judged.push({ n, a: await judge(n, TODAY, c.college_name_place) });
      const d: any = decide(judged, readable);
      ({ status, why, evidence: ev, answers, role } = d);
    } catch (e: any) { err = String(e.message).slice(0, 200); why = 'error'; }
    tally[status] = (tally[status] ?? 0) + 1;
    // RULE: unknown never overwrites a known status; it only records the reason and the check time.
    const update: any = { id: c.id, last_checked: new Date().toISOString(), error_log: err ?? (status === 'unknown' ? why : null) };
    if (status !== 'unknown') Object.assign(update, {
      hiring_status: status, is_hiring: status === 'hiring', verified_at: new Date().toISOString(),
      evidence_title: ev?.title ?? null, evidence_url: ev?.link ?? null, evidence_json: answers ? { ...answers, role } : null,
      open_streams: status === 'hiring' ? ['law'] : [],
    });
    console.log(`${c.id} ${c.college_name_place} -> ${status} (${why}) http=${http}${err ? ' err=' + err.slice(0, 120) : ''}`);
    console.log('ROW ' + JSON.stringify({ id: c.id, s: status, why: why.slice(0, 80), http, err: err?.slice(0, 120), ev: ev ? { t: ev.title.slice(0, 160), d: ev.dates?.[0] } : null, role }));
    if (!DRY) { const { error: e2 } = await supabase.from('colleges').update(update).eq('id', c.id); if (e2) console.error('write failed', e2.message); }
    done++;
    if (done % 25 === 0) saveCache();
  }
  await browser.close(); saveCache();
  console.log('done', done, tally, 'jev', stats);
  // Safety net: a mostly-unknown run is a broken run; fail it so Actions shows red.
  if (done && (tally.unknown ?? 0) / done > 0.4) process.exitCode = 1;
}
main().catch(e => { console.error(e); process.exit(1); });
