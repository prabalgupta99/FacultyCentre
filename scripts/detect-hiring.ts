/**
 * Hiring detector (Jev, per notice). DRAFT: not committed, not run against any account.
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, TYPESAFE_API_KEY (or JEV_MOCK=1 for an offline plumbing test).
 * Flags: --dry-run (no DB writes), --limit N, --ids 1,2,3
 */
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { extractNotices, prefilter, pageReadable, type Notice } from './lib/extract';
import { preflight } from './lib/jev';
import { analyzeUrl } from './lib/analyze';
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
  let q = supabase.from('colleges').select('id, college_name_place, career_page_url').not('career_page_url', 'is', null).neq('career_page_url', '');
  if (IDS) q = q.in('id', IDS);
  const { data: colleges, error } = await q;
  if (error) throw error;
  if (!(await preflight())) { console.error('Jev preflight failed, stopping before any page work.'); process.exit(2); }
  const browser = await chromium.launch();
  const tally: Record<string, number> = {}; let done = 0; const pageCache = new Map<string, { http: number | null; html: string }>(); const verdicts = new Map<string, any>();
  const DEADLINE = Date.now() + Number(process.env.RUN_MAX_MIN || 40) * 60000;
  for (const c of (colleges ?? []).slice(0, LIMIT)) {
    if (Date.now() > DEADLINE) { console.log('DEADLINE reached, stopping early'); break; }
    let status: Status = 'unknown', why = '', ev: Notice | undefined, answers: any, role: string | undefined, http: number | null = null, err: string | null = null;
    try {
      let v = verdicts.get(c.career_page_url);
      if (!v) { v = await Promise.race([analyzeUrl(browser, c.career_page_url, c.college_name_place, TODAY), new Promise<any>((_, rej) => setTimeout(() => rej(new Error('row timeout 180s')), 180000))]); verdicts.set(c.career_page_url, v); }
      ({ status, why, evidence: ev, answers, role } = v as any); http = v.http; if (v.err) err = v.err;
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
