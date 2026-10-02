import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../scripts/lib/decide';
import { extractNotices, DATE_RE } from '../scripts/lib/extract';

const n = { title: 't', context: 'c', link: null, dates: [] };
const a = (noul: number, stream: string, status: string, sc = 0.9) => ({ is_job_notice: { noul }, stream: { choice: stream, confidence: sc }, role_type: { choice: 'faculty_regular', confidence: 0.9 }, status: { choice: status, confidence: 0.9 } });

test('open law notice => hiring', () => assert.equal(decide([{ n, a: a(0.95, 'law', 'open') }], true).status, 'hiring'));
test('open non-law notice only => not_hiring (law-only default)', () => assert.equal(decide([{ n, a: a(0.95, 'other', 'open') }], true).status, 'not_hiring'));
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
