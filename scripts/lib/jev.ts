import crypto from 'node:crypto';
import fs from 'node:fs';
import { STATIC_QUESTIONS, STATUS_QUESTION, MODEL } from './questions';
import type { Notice } from './extract';
import type { Answers } from './decide';

// Modes: real (TYPESAFE_API_KEY set), mock (JEV_MOCK=1: offline plumbing test only, NOT an accuracy measure)
const MOCK = process.env.JEV_MOCK === '1';
// Default: TypeSafe direct. Vercel AI Gateway: JEV_ENDPOINT=https://ai-gateway.vercel.sh/typesafe/v1/systemone, and TYPESAFE_API_KEY holds the gateway key (the workflow does this when the AI_GATEWAY_API_KEY secret exists).
const ENDPOINT = process.env.JEV_ENDPOINT || 'https://api.typesafe.ai/v1/systemone';
const CACHE_FILE = process.env.JEV_CACHE_FILE || '.jev-cache.json';
let cache: Record<string, any> = {};
try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { /* empty */ }
export const saveCache = () => fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
export const stats = { calls: 0, cacheHits: 0, inputChars: 0 };

const hash = (s: string) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 24);

async function call(state: string, questions: object): Promise<any> {
  stats.calls++; stats.inputChars += state.length;
  if (MOCK) return mockAnswer(state, questions);
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, model: process.env.JEV_MODEL || MODEL, questions }),
    });
    if (res.status === 429 || res.status === 529) { await new Promise(r => setTimeout(r, 1000 * 2 ** attempt)); continue; }
    if (!res.ok) { const body = (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200); throw new Error(`Jev ${res.status} ${body}`); }
    return (await res.json()).answers;
  }
  throw new Error('Jev rate limited');
}

/** Static answers are cached by notice-text hash; status is asked fresh (depends on today) and only when needed. */
export async function judge(n: Notice, today: string, institution = ''): Promise<Answers> {
  const staticKey = hash(institution + '|' + n.context);
  let st = cache[staticKey];
  if (st) stats.cacheHits++; else { st = await call(`Institution: ${institution || 'unknown'}\nNotice: ${n.context}`, STATIC_QUESTIONS); cache[staticKey] = st; }
  const a: Answers = { is_job_notice: st.is_job_notice, stream: st.stream, role_type: st.role_type };
  const worthStatus = st.is_job_notice.noul >= 0.4 && st.stream.choice !== 'other';
  if (worthStatus) {
    const s = await call(`Today's date: ${today}.\nInstitution: ${institution || 'unknown'}\nNotice: ${n.context}\nDates found in the notice: ${n.dates.join('; ') || 'none'}`, STATUS_QUESTION);
    a.status = s.status;
  }
  return a;
}

// ---- offline mock: crude rules shaped like real answers, used only to test plumbing ----
function mockAnswer(state: string, questions: any) {
  const t = state.toLowerCase(); const out: any = {};
  const job = /(applications? (are )?invited|walk.?in|recruitment|vacanc|post of|wanted)/.test(t) && !/(result|shortlist|merit list|corrigendum|admission)/.test(t);
  if (questions.is_job_notice) out.is_job_notice = { type: 'noul', noul: job ? 0.9 : 0.1 };
  if (questions.stream) { const law = /\blaw\b|legal|llb|llm/.test(t); out.stream = { type: 'choice', choice: law ? 'law' : /engineer|science|management|commerce|physics|chemistry|english/.test(t) ? 'other' : 'unclear', confidence: 0.8 }; }
  if (questions.role_type) out.role_type = { type: 'choice', choice: /assistant professor|associate professor|professor/.test(t) ? 'faculty_regular' : 'unclear', confidence: 0.7 };
  if (questions.status) {
    const today = /Today's date: (\d{4}-\d{2}-\d{2})/.exec(state)?.[1] ?? '';
    const ds = (state.match(/\d{4}-\d{2}-\d{2}/g) ?? []).filter(d => d !== today);
    out.status = { type: 'choice', choice: ds.length && ds.every(d => d < today) ? 'closed' : 'unclear', confidence: 0.7 };
  }
  return out;
}

/** One tiny call before a run. Prints endpoint, model, whether a key is present (length only, never the value) and the answer or the error body. */
export async function preflight(): Promise<boolean> {
  const key = process.env.TYPESAFE_API_KEY || '';
  console.log(`PREFLIGHT endpoint=${ENDPOINT} model=${process.env.JEV_MODEL || MODEL} keyLength=${key.length} mock=${MOCK}`);
  if (MOCK) return true;
  try {
    const a = await call('Notice: Applications are invited for the post of Assistant Professor (Law). Last date 30 Nov 2099.', { is_job_notice: STATIC_QUESTIONS.is_job_notice });
    console.log('PREFLIGHT ok ' + JSON.stringify(a).slice(0, 200)); return true;
  } catch (e: any) { console.log('PREFLIGHT FAILED ' + String(e.message).slice(0, 300)); return false; }
}
