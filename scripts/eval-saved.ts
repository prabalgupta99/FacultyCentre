/**
 * Offline evaluation on the 50 saved pages (no network except Jev, no database, no Supabase).
 *   JEV_MOCK=1 npx tsx scripts/eval-saved.ts <pages_dir> <labels.csv>     # plumbing test, NOT an accuracy number
 *   TYPESAFE_API_KEY=... npx tsx scripts/eval-saved.ts <pages_dir> <labels.csv>   # real Jev run (after his key step)
 * pages_dir contains p50_<id>.html. Prints old vs new vs label and writes eval-report.json.
 */
import fs from 'node:fs';
import { extractNotices, prefilter, pageReadable } from './lib/extract';
import { decide, type Judged } from './lib/decide';
import { judge, stats } from './lib/jev';

const [dir, csvPath] = process.argv.slice(2);
const TODAY = process.env.EVAL_TODAY || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
function parseCsv(t: string) { const rows: string[][] = []; let r: string[] = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { if (c === '"' && t[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else if (c === '"') q = true; else if (c === ',') { r.push(f); f = ''; } else if (c === '\n') { r.push(f); rows.push(r); r = []; f = ''; } else if (c !== '\r') f += c; }
  if (f || r.length) { r.push(f); rows.push(r); } return rows; }
(async () => {
  const [head, ...rows] = parseCsv(fs.readFileSync(csvPath, 'utf8')); const ix = (k: string) => head.indexOf(k);
  const out: any[] = [];
  for (const r of rows) {
    const id = r[ix('id')]; const label = r[ix('label_law_faculty_open')]; const conf = r[ix('label_confidence')];
    const file = `${dir}/p50_${id}.html`; const old = r[ix('old_is_hiring')];
    let neu = 'unknown', why = 'no saved page';
    if (fs.existsSync(file)) {
      const html = fs.readFileSync(file, 'utf8'); const readable = pageReadable(200, html);
      const notices = readable ? extractNotices(html, r[ix('career_url')]).filter(prefilter).slice(0, 40) : [];
      const judged: Judged[] = []; for (const n of notices) judged.push({ n, a: await judge(n, TODAY, r[ix('college')]) });
      const d: any = decide(judged, readable); neu = d.status; why = d.why;
    }
    out.push({ id, college: r[ix('college')], label, conf, old: old === 'True' ? 'hiring' : /NO RESULT/.test(old) ? 'no_result' : 'not_hiring', new: neu, why });
  }
  const confident = out.filter(o => ['yes', 'no'].includes(o.label) && ['high', 'medium'].includes(o.conf));
  const score = (k: 'old' | 'new') => { const c = confident.filter(o => o[k] !== 'unknown' && o[k] !== 'no_result');
    const ok = c.filter(o => (o[k] === 'hiring') === (o.label === 'yes')).length;
    return { answered: c.length, correct: ok, wrong: c.length - ok, abstained: confident.length - c.length }; };
  const report = { today: TODAY, mode: process.env.JEV_MOCK === '1' ? 'MOCK (plumbing only)' : 'real Jev', labeled_confident: confident.length, old: score('old'), new: score('new'), jev: stats, rows: out };
  fs.writeFileSync('eval-report.json', JSON.stringify(report, null, 1));
  console.log(JSON.stringify({ ...report, rows: undefined }, null, 1));
  console.table(out.map(o => ({ id: o.id, label: o.label, conf: o.conf, old: o.old, new: o.new })));
})();
