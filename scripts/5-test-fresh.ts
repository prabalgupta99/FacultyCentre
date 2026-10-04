import assert from 'node:assert';
import { freshness, downgradeIfStale } from './lib/fresh';
const T = '2026-10-03';
// NLS: posted 25 Aug, text also carries the 26 Oct deadline -> fresh
assert.equal(freshness(['August 25, 2026', '26 October 2026'], T), 'fresh');
// old post with deadline only in a linked PDF: stale, but must never become not_hiring
assert.equal(freshness(['10 August 2026'], T), 'stale');
assert.equal(downgradeIfStale({ status: 'not_hiring', why: 'x' }, true).status, 'unknown');
assert.equal(downgradeIfStale({ status: 'hiring' }, true).status, 'hiring');
assert.equal(downgradeIfStale({ status: 'not_hiring' }, false).status, 'not_hiring');
// 2023 walk-in stays stale; undated stays fresh; dd.mm.yyyy future date keeps it fresh
assert.equal(freshness(['12.12.2023'], T), 'stale');
assert.equal(freshness([], T), 'fresh');
assert.equal(freshness(['01.08.2026', '19.10.2026'], T), 'fresh');
console.log('fresh tests ok');
