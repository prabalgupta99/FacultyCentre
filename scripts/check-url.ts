/**
 * Give it any career page URL, get a verdict: hiring (with quoted proof), not_hiring, or unknown.
 *   npx tsx scripts/check-url.ts https://example.edu/careers [more urls]
 *   npx tsx scripts/check-url.ts --file check-urls.txt     (one URL per line, optional "| College name")
 * Never writes anywhere. Needs the Jev key in env (TYPESAFE_API_KEY, optionally JEV_ENDPOINT and JEV_MODEL).
 */
import fs from 'node:fs';
import { chromium } from '@playwright/test';
import { analyzeUrl } from './lib/analyze';
import { saveCache, stats, preflight } from './lib/jev';

const TODAY = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const args = process.argv.slice(2);
const items: { url: string; name: string }[] = [];
if (args[0] === '--file') {
  for (const line of fs.readFileSync(args[1], 'utf8').split('\n')) { const t = line.trim(); if (!t || t.startsWith('#')) continue; const [u, n] = t.split('|').map(s => s.trim()); items.push({ url: u, name: n || '' }); }
} else for (const a of args) items.push({ url: a, name: '' });

(async () => {
  if (!(await preflight())) process.exit(2);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const it of items) {
    const v = await analyzeUrl(browser, it.url, it.name, TODAY);
    console.log('VERDICT ' + JSON.stringify({ url: v.url, status: v.status, why: v.why, http: v.http, via: v.via.length > 1 ? v.via : undefined, proof: v.evidence ? { text: v.evidence.title, link: v.evidence.link, dates: v.evidence.dates } : undefined, role: v.role, notices: v.notices, err: v.err }));
  }
  await browser.close(); saveCache(); console.log('jev', stats);
})();
