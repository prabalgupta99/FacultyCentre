import crypto from 'node:crypto';
import fs from 'node:fs';
import { STATIC_QUESTIONS, STATUS_QUESTION, BOOL_QUESTIONS, MODEL } from './questions';
import type { Notice } from './extract';
import { DATE_RE } from './extract';
import { parseDate } from './fresh';
import type { Answers } from './decide';

// Modes: real (TYPESAFE_API_KEY set), mock (JEV_MOCK=1: offline plumbing test only, NOT an accuracy measure)
const MOCK = process.env.JEV_MOCK === '1';
// Default: TypeSafe direct. Vercel AI Gateway: JEV_ENDPOINT=https://ai-gateway.vercel.sh/typesafe/v1/systemone, and TYPESAFE_API_KEY holds the gateway key (the workflow does this when the AI_GATEWAY_API_KEY secret exists).
const ENDPOINT = process.env.JEV_ENDPOINT || 'https://api.typesafe.ai/v1/systemone';
const CACHE_FILE = process.env.JEV_CACHE_FILE || '.jev-cache.json';
let cache: Record<string, any> = {};
try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { /* empty */ }
export const saveCache = () => fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
let activeModel = '';
let lastCall = 0;
export const stats = { calls: 0, cacheHits: 0, inputChars: 0 };

const hash = (s: string) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 24);

async function call(state: string, questions: object): Promise<any> {
  stats.calls++; stats.inputChars += state.length;
  if (MOCK) return mockAnswer(state, questions);
  for (let attempt = 0; attempt < 4; attempt++) {
    const gap = Number(process.env.JEV_MIN_GAP_MS || 5000); const wait = lastCall + gap - Date.now(); if (wait > 0) await new Promise(r => setTimeout(r, wait)); lastCall = Date.now();
    const t0 = Date.now();
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({ state, model: activeModel || process.env.JEV_MODEL || MODEL, questions }),
    });
    if (res.status === 429 || res.status === 529) { const ra = Number(res.headers.get('retry-after')) || 0; await new Promise(r => setTimeout(r, Math.min(60000, Math.max(ra * 1000, 3000 * 2 ** attempt)))); continue; }
    if (!res.ok) { const body = (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200); throw new Error(`Jev ${res.status} ${body}`); }
    console.log(`JEVCALL ${Date.now() - t0}ms status=${res.status} attempt=${attempt}`);
    return (await res.json()).answers;
  }
  throw new Error('Jev rate limited');
}

/** Static answers are cached by notice-text hash; status is asked fresh (depends on today) and only when needed. */
const toChoice = (x: any, yes: string, no: string) => { const p = x?.noul; if (typeof p !== 'number') return { choice: 'unclear', confidence: 0 }; return p >= 0.5 ? { choice: yes, confidence: p } : { choice: no, confidence: 1 - p }; };

// The model said 'closed' for undated ticker lines (Allahabad, rerun 3). Without a date or an explicit closed word, closed cannot be claimed: unclear.
export function undatedGuard(st: { choice: string; confidence: number }, n: { context: string; dates: string[] }) {
  // Dates in the notice's own opening text only: a ticker blob pulls in dates and words from its neighbours.
  const own = n.context.slice(0, 200);
  if (st.choice === 'closed' && !(own.match(DATE_RE) || []).length && !/closed|has ended|expired|result|shortlist|cancel/i.test(own.slice(0, 150))) return { choice: 'unclear', confidence: 0 };
  return st;
}
// A stated last date that has already passed means closed, whatever the model says (NUALS "Last date extended up to 03.09.2026", seen 4 Oct).
export function lastDatePassed(context: string, today: string): boolean {
  const t = new Date(today).getTime(); const ds: number[] = [];
  const re = /(?:last\s*date|up\s*to|upto|till|on or before|before|deadline)[^0-9A-Za-z]{0,25}((?:\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4})|(?:\d{1,2}(?:st|nd|rd|th)?[\s-]+[A-Za-z]{3,9}[\s,-]+\d{4}))/gi; let m: RegExpExecArray | null;
  while ((m = re.exec(context))) { const d = parseDate(m[1]); if (d && d.getFullYear() >= 2020) ds.push(d.getTime()); }
  return ds.length > 0 && ds.every(x => x < t);
}
export async function judge(n: Notice, today: string, institution = ''): Promise<Answers> {
  // One call per notice with four yes/no questions. Cached by text + today. Probabilities map to the choice shape decide() reads.
  const key = hash('v2|' + institution + '|' + n.context + '|' + today);
  let st = cache[key];
  if (st) stats.cacheHits++; else {
    st = await call(`Today's date: ${today}.\nInstitution: ${institution || 'unknown'}\nNotice: ${n.context}\nDates found in the notice: ${n.dates.join('; ') || 'none'}`, BOOL_QUESTIONS);
    cache[key] = st;
  }
  return {
    is_job_notice: st.is_job_notice,
    stream: toChoice(st.is_law, 'law', 'other'),
    role_type: toChoice(st.is_faculty, 'faculty_regular', 'non_teaching'),
    status: lastDatePassed(n.context, today) ? { choice: 'closed', confidence: 1 } : undatedGuard(toChoice(st.is_open, 'open', 'closed'), n),
    raw: { law: st.is_law?.noul, open: st.is_open?.noul, faculty: st.is_faculty?.noul },
  } as any;
}

// ---- offline mock: crude rules shaped like real answers, used only to test plumbing ----
function mockAnswer(state: string, questions: any) {
  const t = state.toLowerCase(); const out: any = {};
  const job = /(applications? (are )?invited|walk.?in|recruitment|vacanc|post of|wanted)/.test(t) && !/(result|shortlist|merit list|corrigendum|admission)/.test(t);
  if (questions.is_job_notice) out.is_job_notice = { type: 'noul', noul: job ? 0.9 : 0.1 };
  if (questions.is_law) { const law = /\blaw\b|legal|llb|llm/.test(t); out.is_law = { type: 'noul', noul: law ? 0.9 : 0.1 }; out.is_faculty = { type: 'noul', noul: /professor/.test(t) ? 0.9 : 0.1 }; const today = /Today's date: (\d{4}-\d{2}-\d{2})/.exec(state)?.[1] ?? ''; const ds = (state.match(/\d{4}-\d{2}-\d{2}/g) ?? []).filter(d => d !== today); out.is_open = { type: 'noul', noul: ds.length && ds.every(d => d < today) ? 0.1 : 0.8 }; }
  if (questions.stream) { const law = /\blaw\b|legal|llb|llm/.test(t); out.stream = { type: 'choice', choice: law ? 'law' : /engineer|science|management|commerce|physics|chemistry|english/.test(t) ? 'other' : 'unclear', confidence: 0.8 }; }
  if (questions.role_type) out.role_type = { type: 'choice', choice: /assistant professor|associate professor|professor/.test(t) ? 'faculty_regular' : 'unclear', confidence: 0.7 };
  if (questions.status) {
    const today = /Today's date: (\d{4}-\d{2}-\d{2})/.exec(state)?.[1] ?? '';
    const ds = (state.match(/\d{4}-\d{2}-\d{2}/g) ?? []).filter(d => d !== today);
    out.status = { type: 'choice', choice: ds.length && ds.every(d => d < today) ? 'closed' : 'unclear', confidence: 0.7 };
  }
  return out;
}

/** Before a run: try each candidate model with one tiny call, keep the first that answers. Prints endpoint, model, key length (never the key) and the answer or error body. */
export async function preflight(): Promise<boolean> {
  const key = process.env.TYPESAFE_API_KEY || '';
  console.log(`PREFLIGHT endpoint=${ENDPOINT} keyLength=${key.length} mock=${MOCK}`);
  if (MOCK) return true;
  const cands = (process.env.JEV_MODELS || process.env.JEV_MODEL || MODEL).split(',').map(x => x.trim()).filter(Boolean);
  for (const m of cands) {
    activeModel = m;
    try {
      const a = await call('Notice: Applications are invited for the post of Assistant Professor (Law). Last date 30 Nov 2099.', { is_job_notice: STATIC_QUESTIONS.is_job_notice });
      if (!a?.is_job_notice || typeof a.is_job_notice.noul !== 'number') { console.log(`PREFLIGHT model=${m} unexpected answer shape ${JSON.stringify(a).slice(0, 160)}`); continue; }
      console.log(`PREFLIGHT ok model=${m} ${JSON.stringify(a).slice(0, 160)}`); return true;
    } catch (e: any) { console.log(`PREFLIGHT model=${m} FAILED ${String(e.message).slice(0, 260)}`); }
  }
  activeModel = ''; return false;
}
