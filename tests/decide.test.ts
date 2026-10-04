import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../scripts/lib/decide';
import { extractNotices, DATE_RE } from '../scripts/lib/extract';

const n = { title: 't', context: 'Applications invited for the post of Assistant Professor (Law)', link: null, dates: [] };
const a = (noul: number, stream: string, status: string, sc = 0.9) => ({ is_job_notice: { noul }, stream: { choice: stream, confidence: sc }, role_type: { choice: 'faculty_regular', confidence: 0.9 }, status: { choice: status, confidence: 0.9 } });

test('open law notice => hiring', () => assert.equal(decide([{ n, a: a(0.95, 'law', 'open') }], true).status, 'hiring'));
test('two open non-law notices => unknown (list of non-law notices is not proof)', () => assert.equal(decide([{ n, a: a(0.95, 'other', 'open') }, { n: { ...n, title: 'u', context: 'Applications invited for Assistant Professor Physics' }, a: a(0.95, 'other', 'open') }], true).status, 'unknown'));
test('closed law notice => not_hiring', () => assert.equal(decide([{ n, a: a(0.95, 'law', 'closed') }], true).status, 'not_hiring'));
test('mixed counts as law', () => assert.equal(decide([{ n, a: a(0.95, 'mixed', 'open') }], true).status, 'hiring'));
test('low confidence stream => unknown', () => assert.equal(decide([{ n, a: a(0.95, 'law', 'open', 0.3) }], true).status, 'unknown'));
test('law notice with unclear status => unknown', () => assert.equal(decide([{ n, a: a(0.95, 'law', 'unclear') }], true).status, 'unknown'));
test('maybe-job (0.5) => unknown, not not_hiring', () => assert.equal(decide([{ n, a: a(0.5, 'law', 'open') }], true).status, 'unknown'));
test('result-only page => unknown (no job judged)', () => assert.equal(decide([{ n, a: a(0.05, 'law', 'closed') }], true).status, 'unknown'));
test('unreadable page => unknown', () => assert.equal(decide([], false).status, 'unknown'));
test('empty parse => unknown', () => assert.equal(decide([], true).status, 'unknown'));
test('date regex handles 21-Jul-2026 and 5th August 2026', () => {
  assert.ok('Last date 21-Jul-2026'.match(DATE_RE)); assert.ok('Last date: 5th August 2026'.match(DATE_RE)); });
test('date beside a notice (parent block) is attached', () => {
  const html = '<ul><li><a href="/x">Applications are invited for Assistant Professor in Law at the University</a><span>Last date: 5th August 2026</span></li></ul>';
  const ns = extractNotices(html, 'https://e.com/'); assert.ok(ns.some(x => x.dates.length > 0)); });

// Regression tests from the mistake log (run 29, 3 Oct 2026)
const nt = { title: 'APPLICATIONS ARE INVITED FOR VARIOUS NON-TEACHING POSITIONS', context: 'APPLICATIONS ARE INVITED FOR VARIOUS NON-TEACHING POSITIONS', link: null, dates: [] };
const nonTeach = { ...a(0.9, 'law', 'open'), role_type: { choice: 'non_teaching', confidence: 0.55 } };
test('REGRESSION Vignan: non-teaching notice must not be hiring', () => assert.notEqual(decide([{ n: nt, a: nonTeach }], true).status, 'hiring'));
test('REGRESSION Chotanagpur: application-form dropdown is not a notice', async () => {
  const { prefilter } = await import('../scripts/lib/extract');
  assert.equal(prefilter({ title: 'Position Applied For: * --Select-- Assistant Professor (Law) Assistant Professor (Management)', context: 'Position Applied For: * --Select-- Assistant Professor (Law) Assistant Professor (Management) Apply now vacancy', link: null, dates: [] }), false); });
test('REGRESSION generic recruitment heading is not a lead', () => {
  const g = { title: 'All Recruitment Notifications', context: 'All Recruitment Notifications', link: null, dates: [] };
  const ans: any = { ...a(0.8, 'law', 'open'), raw: { law: 0.6, open: 0.7, faculty: 0.6 } };
  assert.ok(!(decide([{ n: g, a: ans }], true) as any).lead); });
test('REGRESSION medical and MBA adverts at a law-named page are not law leads', () => {
  const m = { title: 't', context: 'Rolling Advertisement for various Faculty Positions for Dr. B.C. Roy Multi-Speciality Medical Research Centre Assistant Professor', link: null, dates: [] };
  const ans: any = { ...a(0.85, 'law', 'open', 0.52), raw: { law: 0.52, open: 0.65, faculty: 0.7 } };
  const r: any = decide([{ n: m, a: ans }], true, 'Law College, Somewhere');
  assert.notEqual(r.status, 'hiring'); assert.ok(!r.lead); });
test('REGRESSION cancellation notice is dropped before judging', async () => {
  const { prefilter } = await import('../scripts/lib/extract');
  assert.equal(prefilter({ title: 'Cancellation of Re-Advertisement No. 03/Law/2026-27 and LSC for the post of Guest Teacher', context: 'Cancellation of Re-Advertisement No. 03/Law/2026-27 for the post of Guest Teacher', link: null, dates: [] }), false); });
test('REGRESSION select-field text is a form, not a notice', async () => {
  const { prefilter } = await import('../scripts/lib/extract');
  assert.equal(prefilter({ title: 'Select Professor Associate Professor Assistant Professor Research Assistant This field is required.', context: 'Select Professor Associate Professor Assistant Professor Research Assistant This field is required. vacancy apply', link: null, dates: [] }), false); });
test('hiring needs law named in the notice itself; institution-only law is a review lead, not a tag', () => {
  const m = { title: 't', context: 'Application for the post of Faculty Professor', link: null, dates: [] };
  const ans: any = { ...a(0.85, 'law', 'open', 0.8), raw: { law: 0.8, open: 0.8, faculty: 0.8 } };
  const r: any = decide([{ n: m, a: ans }], true, 'National Law University');
  assert.notEqual(r.status, 'hiring'); });

// Added 4 Oct: hiring needs an application cue; not_hiring needs evidence.
const nCue = { title: 'Associate Professor of Law', context: 'Associate Professor of Law', link: null, dates: [] as string[] };
test('faculty profile line with no application cue => not hiring tag', () => assert.notEqual(decide([{ n: nCue, a: a(0.95, 'law', 'open') }], true, 'KLE Law').status, 'hiring'));
test('one stray non-law job notice => unknown, not not_hiring', () => assert.equal(decide([{ n, a: a(0.95, 'other', 'open') }], true).status, 'unknown'));

test('window-derived law mention can be a lead but never a hiring tag', () => {
  const w = { title: 'w', context: 'Faculty Hiring. Applications invited for Assistant Professor in School of Law Core Law Domains', link: null, dates: [] as string[], fromWindow: true };
  const ans: any = { ...a(0.9, 'law', 'open'), raw: { law: 0.9, open: 0.9, faculty: 0.9 } };
  const r: any = decide([{ n: w, a: ans }], true, 'Some University'); assert.notEqual(r.status, 'hiring'); });
test('lawWindows finds a law domain list on a faculty hiring page', async () => {
  const { lawWindows } = await import('../scripts/lib/extract');
  const html = '<body><p>' + 'x '.repeat(200) + 'Faculty Hiring: Apply now for Assistant Professor. School of Law: Core Law Domains Jurisprudence, Criminal Law.</p></body>';
  assert.ok(lawWindows(html, 'Other University').length >= 1);
  assert.equal(lawWindows('<body><p>' + 'x '.repeat(200) + 'School of Law admission open for LLB students.</p></body>', '').length, 0); });

test('REGRESSION Allahabad: undated ticker line judged closed by the model is not closed', async () => {
  const { undatedGuard } = await import('../scripts/lib/jev');
  assert.equal(undatedGuard({ choice: 'closed', confidence: 0.89 }, { context: 'Recruitment for the Engagement of Contractual Faculty for B.A.LL.B.(Hons)', dates: [] }).choice, 'unclear');
  assert.equal(undatedGuard({ choice: 'closed', confidence: 0.89 }, { context: 'Recruitment for Faculty. Last date 5 Sep 2026', dates: ['5 Sep 2026'] }).choice, 'closed'); });
test('undated law faculty notice with open-leaning model gets a review lead, not not_hiring', () => {
  const nn = { title: 't', context: 'Recruitment for the Engagement of Contractual Faculty for B.A.LL.B.(Hons)', link: null, dates: [] as string[] };
  const ans: any = { is_job_notice: { noul: 0.97 }, stream: { choice: 'law', confidence: 0.98 }, role_type: { choice: 'faculty_regular', confidence: 0.98 }, status: { choice: 'unclear', confidence: 0 }, raw: { law: 0.98, open: 0.11, faculty: 0.98 } };
  const r: any = decide([{ n: nn, a: ans }], true, 'University of Allahabad'); assert.equal(r.status, 'unknown'); assert.ok(r.lead); });

test('REGRESSION Allahabad ticker: later words like "result" in the same blob do not make the notice closed', async () => {
  const { undatedGuard } = await import('../scripts/lib/jev');
  const ctx = 'Recruitment for the Engagement of Contractual Faculty for B.A.LL.B.(Hons) Five year Integrated Course (Self Finance) | Press Release: Correction Window (Ph.D. Admissions-2026) | Press release of PGAT 26 result (PGAT 2 and IPS)';
  assert.equal(undatedGuard({ choice: 'closed', confidence: 0.89 }, { context: ctx, dates: [] }).choice, 'unclear'); });

test('REGRESSION Allahabad blob: dates borrowed from neighbours do not make an undated line closed', async () => {
  const { undatedGuard } = await import('../scripts/lib/jev');
  assert.equal(undatedGuard({ choice: 'closed', confidence: 0.89 }, { context: 'Recruitment for the Engagement of Contractual Faculty for B.A.LL.B.(Hons) | Press Release PGAT 2025-26', dates: ['2025-26', '12.05.2025'] }).choice, 'unclear'); });

test('REGRESSION NUALS: a stated last date in the past is closed', async () => {
  const { lastDatePassed } = await import('../scripts/lib/jev');
  assert.equal(lastDatePassed('August112026RecruitmentNewAppointment to the Post of Assistant Professor in Law - Last date extended up to 03.09.2026PDF', '2026-10-04'), true);
  assert.equal(lastDatePassed('Apply. Last date 20.10.2026', '2026-10-04'), false);
  assert.equal(lastDatePassed('Post of Professor of Law', '2026-10-04'), false); });
test('REGRESSION KLE: faculty profile line without application wording is not a lead', () => {
  const nn = { title: 'Assistant Professor of Law', context: 'Assistant Professor of Law', link: null, dates: [] as string[] };
  const ans: any = { is_job_notice: { noul: 0.8 }, stream: { choice: 'law', confidence: 0.9 }, role_type: { choice: 'faculty_regular', confidence: 0.9 }, status: { choice: 'unclear', confidence: 0 }, raw: { law: 0.9, open: 0.6, faculty: 0.9 } };
  const r: any = decide([{ n: nn, a: ans }], true, 'KLE Law'); assert.ok(!r.lead); });

test('REGRESSION NLS: "Work With Us" is a career link hint', async () => {
  const src = (await import('node:fs')).readFileSync(new URL('../scripts/lib/analyze.ts', import.meta.url), 'utf8');
  assert.ok(/work\.\?with\.\?us/.test(src)); });
