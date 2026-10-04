import { MIN_CONFIDENCE, MIN_NOUL, NOUL_MAYBE } from './questions';
import type { Notice } from './extract';
import { DATE_RE } from './extract';

export type Status = 'hiring' | 'not_hiring' | 'unknown';
export type Answers = {
  is_job_notice: { noul: number };
  stream: { choice: string; confidence: number };
  role_type: { choice: string; confidence: number };
  status?: { choice: string; confidence: number };
};
export type Judged = { n: Notice; a: Answers };

export const pick = (x?: { choice: string; confidence: number }) => (x && x.confidence >= MIN_CONFIDENCE ? x.choice : 'unclear');

const LAW_WORD = /\blaw\b|legal|\bllb\b|\bllm\b|ll\.?\s?[bm]\b|jurisprudence|judicial/i;
const OTHER_DEPT = /medical|\bmba\b|management|engineering|technology|pharm|nursing|computer|commerce|science|physics|chemistry|mathematics|architecture|dental|hospital/i;
// Law gate (deterministic, on top of the model): the notice names law, or the institution is a law institution and the notice names no other department.
export const lawGate = (ctx: string, institution = '') => LAW_WORD.test(ctx) || (LAW_WORD.test(institution) && !OTHER_DEPT.test(ctx));

// A hiring tag needs wording of an actual opening, not just a faculty title on a staff page.
const APPLY_CUE = /(apply|applications?\b.{0,30}(invited|are invited|invites)|invit(e|es|ed)\b|last date|walk.?in|vacanc|recruit|advertis|advt|notification|wanted|required|openings?|posts? of|post of|call for|empanel)/i;
export const hasApplyCue = (ctx: string) => APPLY_CUE.test(ctx);

export function decide(judged: Judged[], pageRead: boolean, institution = '') {
  if (!pageRead) return { status: 'unknown' as Status, why: 'page not readable' };
  const jobs = judged.filter(j => j.a.is_job_notice.noul >= MIN_NOUL);
  const maybeJobs = judged.filter(j => j.a.is_job_notice.noul >= NOUL_MAYBE && j.a.is_job_notice.noul < MIN_NOUL);
  const lawish = (j: Judged) => ['law', 'mixed'].includes(pick(j.a.stream));
  const FACULTY_WORD = /professor|faculty|lecturer|teacher|teaching|instructor/i;
  const isFaculty = (j: Judged) => pick(j.a.role_type).startsWith('faculty') && FACULTY_WORD.test(j.n.context) && !/non[- ]?teaching/i.test(j.n.context.slice(0, 160));
  const openLaw = jobs.filter(j => !j.n.fromWindow && lawish(j) && LAW_WORD.test(j.n.context) && !OTHER_DEPT.test(j.n.context.slice(0, 200)) && pick(j.a.status) === 'open' && isFaculty(j) && hasApplyCue(j.n.context));
  if (openLaw.length) {
    const best = openLaw[0];
    return { status: 'hiring' as Status, why: 'open law notice', evidence: best.n, answers: best.a, openStreams: ['law'], role: pick(best.a.role_type) };
  }
  // Human-review leads: a probable job notice with law and open both leaning yes. Not a tag; never written as hiring.
  const leads = judged.filter(j => { const r: any = (j.a as any).raw; return r && j.a.is_job_notice.noul >= 0.6 && r.law >= 0.4 && lawGate(j.n.context, institution) && (r.open >= 0.5 || !(j.n.context.slice(0, 200).match(DATE_RE) || []).length) && hasApplyCue(j.n.context) && pick(j.a.status) !== 'closed' && r.faculty >= 0.5 && /professor|faculty|lecturer|teacher|teaching|instructor/i.test(j.n.context) && !/non[- ]?teaching/i.test(j.n.context.slice(0, 160)); })
    .sort((x: any, y: any) => (y.a.raw.law + y.a.raw.open + y.a.is_job_notice.noul) - (x.a.raw.law + x.a.raw.open + x.a.is_job_notice.noul));
  if (leads.length) return { status: 'unknown' as Status, why: 'possible opening, needs human review', lead: true, evidence: leads[0].n, answers: leads[0].a, role: pick(leads[0].a.role_type) };
  const unclear = jobs.some(j => pick(j.a.stream) === 'unclear' || (lawish(j) && pick(j.a.status) === 'unclear'));
  if (unclear || maybeJobs.length) return { status: 'unknown' as Status, why: 'notices with unclear stream, status or job-ness' };
  if (!jobs.length) return { status: 'unknown' as Status, why: judged.length ? 'no notice judged a job' : 'no job-like notices parsed (empty page or unreadable list)' };
  // not_hiring needs real evidence: a closed law notice, or nothing weaker.
  const closedLaw = jobs.some(j => lawish(j) && pick(j.a.status) === 'closed');
  // A list of non-law notices is not proof: the reader may have missed the law post (rerun 2: 6 of 7 such tags were wrong). Only a closed law notice proves not_hiring.
  if (closedLaw) return { status: 'not_hiring' as Status, why: 'job notices found, none open for law' };
  return { status: 'unknown' as Status, why: 'job notices seen but not conclusive for law' };
}
