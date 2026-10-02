import { MIN_CONFIDENCE, MIN_NOUL, NOUL_MAYBE } from './questions';
import type { Notice } from './extract';

export type Status = 'hiring' | 'not_hiring' | 'unknown';
export type Answers = {
  is_job_notice: { noul: number };
  stream: { choice: string; confidence: number };
  role_type: { choice: string; confidence: number };
  status?: { choice: string; confidence: number };
};
export type Judged = { n: Notice; a: Answers };

export const pick = (x?: { choice: string; confidence: number }) => (x && x.confidence >= MIN_CONFIDENCE ? x.choice : 'unclear');

export function decide(judged: Judged[], pageRead: boolean) {
  if (!pageRead) return { status: 'unknown' as Status, why: 'page not readable' };
  const jobs = judged.filter(j => j.a.is_job_notice.noul >= MIN_NOUL);
  const maybeJobs = judged.filter(j => j.a.is_job_notice.noul >= NOUL_MAYBE && j.a.is_job_notice.noul < MIN_NOUL);
  const lawish = (j: Judged) => ['law', 'mixed'].includes(pick(j.a.stream));
  const openLaw = jobs.filter(j => lawish(j) && pick(j.a.status) === 'open');
  if (openLaw.length) {
    const best = openLaw[0];
    return { status: 'hiring' as Status, why: 'open law notice', evidence: best.n, answers: best.a, openStreams: ['law'], role: pick(best.a.role_type) };
  }
  const unclear = jobs.some(j => pick(j.a.stream) === 'unclear' || (lawish(j) && pick(j.a.status) === 'unclear'));
  if (unclear || maybeJobs.length) return { status: 'unknown' as Status, why: 'notices with unclear stream, status or job-ness' };
  if (!jobs.length) return { status: 'unknown' as Status, why: judged.length ? 'no notice judged a job' : 'no job-like notices parsed (empty page or unreadable list)' };
  return { status: 'not_hiring' as Status, why: 'job notices found, none open for law' };
}
