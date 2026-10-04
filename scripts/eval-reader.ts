/** Offline reader test: no Jev, no writes. For each labelled site, can the reader reach a page with a law-faculty notice?
 *  npx tsx scripts/eval-reader.ts labels.csv old|new */
import fs from 'node:fs';
import * as cheerio from 'cheerio';
import { chromium, type Browser } from '@playwright/test';
import { pdfNotices } from './lib/pdf';
import { extractNotices, prefilter, pageReadable } from './lib/extract';

const MODE = process.argv[3] || 'new';
const LAW = /\blaw\b|legal|\bllb\b|\bllm\b/i;
const FAC = /professor|faculty|lecturer|teaching|teacher/i;
const HINT_OLD = /(career|recruit|vacanc|opening|jobs?\b|walk.?in|advertis|notification|join.?us)/i;
const HINT_NEW = /(notices?|announcements?|latest|what.?s new|recruitment|career|recruit|vacanc|opening|jobs?\b|walk.?in|advertis|notification|join.?us|faculty|teaching|work with us|employment|apply|announcement|notice)/i;
const NOT_PAGE = /(non[-_ ]?teaching|\/people|\/faculty\/|\/staff|\/team|login|signin|register|admission|alumni|news-?letter)/i;
const TODAY = new Date('2026-10-03');
const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function parseDate(d: string): Date | null {
  let m = d.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/); if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return new Date(y, +m[2] - 1, +m[1]); }
  m = d.match(/(\d{1,2})(?:st|nd|rd|th)?[\s-]+([A-Za-z]{3})[a-z]*[\s,-]+(\d{2,4})/); if (m) return new Date(+m[3] < 100 ? 2000 + +m[3] : +m[3], MONTHS[m[2].toLowerCase()], +m[1]);
  m = d.match(/([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/); if (m) return new Date(+m[3], MONTHS[m[1].toLowerCase()], +m[2]);
  m = d.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return null;
}
/** Recent = has a date within 45 days before today or any later date; no date at all = undated (not recent). */
const recent = (dates: string[]) => dates.map(parseDate).filter((x): x is Date => !!x && x.getFullYear() >= 2025).some(x => x.getTime() >= TODAY.getTime() - 45 * 864e5);
const SKIP = /\.(jpg|jpeg|png|gif|zip|xlsx?|docx?)(\?|$)|^(mailto|tel|javascript):/i;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const root = (h: string) => h.split('.').slice(-2).join('.');

async function load(b: Browser, url: string, retry: boolean) {
  for (let t = 0; t < (retry ? 2 : 1); t++) {
    const page = await b.newPage({ userAgent: retry ? 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36' : undefined });
    try {
      const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      const out = { http: r?.status() ?? null, html: await page.content() };
      if (!(retry && out.http && out.http >= 403 && t === 0)) return out;
    } catch (e) { if (t === (retry ? 1 : 0)) return { http: null, html: '' }; } finally { await page.close(); }
    await sleep(4000);
  }
  return { http: null, html: '' };
}
function links(html: string, base: string, seen: Set<string>, hint: RegExp, cap: number) {
  const $ = cheerio.load(html); const out: { u: string; s: number }[] = [];
  $('a[href]').each((_, a) => {
    const href = $(a).attr('href') || ''; const text = $(a).text().replace(/\s+/g, ' ').trim();
    if (SKIP.test(href) || NOT_PAGE.test(href) || !(hint.test(text) || hint.test(href))) return;
    try { const u = new URL(href, base); u.hash = ''; const s = u.href;
      if (seen.has(s) || !/^https?:/.test(s) || root(new URL(base).hostname) !== root(u.hostname)) return;
      const score = (/career|recruit|vacanc|opening/i.test(text + href) ? 3 : 0) + (/faculty|teaching|professor|law/i.test(text) && !/non[-_ ]?teaching/i.test(text + href) ? 2 : 0) + (/\.pdf/i.test(href) ? 1 : 0);
      out.push({ u: s, s: score });
    } catch { /* ignore */ }
  });
  return out.sort((a, b) => b.s - a.s).map(x => x.u).filter((u, i, a) => a.indexOf(u) === i).slice(0, cap);
}
async function reach(b: Browser, site: string) {
  const neu = MODE === 'new'; const maxPages = neu ? 8 : 4; const seen = new Set([site]); const queue = [site]; const visited: string[] = []; let found: any = null; let first = true; let leadFound: any = null; let blocked = false;
  while (queue.length && visited.length < maxPages) {
    const u = queue.shift()!; visited.push(u);
    if (neu && /non[-_ ]?teaching/i.test(u)) continue;
    if (neu && /\.pdf(\?|$)/i.test(u)) {
      const pn = (await pdfNotices(u)).filter(n => recent(n.dates));
      if (pn.length) { found = { page: u, text: pn[0].context.slice(0, 160), dates: pn[0].dates.slice(0, 3) }; break; }
      await sleep(2500); continue;
    }
    const { http, html } = await load(b, u, neu);
    if (first && (!http || http >= 400 || html.length < 1500)) blocked = true;
    if (pageReadable(http, html)) {
      const all = extractNotices(html, u).filter(prefilter).filter(n => FAC.test(n.context));
      const hits = all.filter(n => LAW.test(n.context) && (!neu || recent(n.dates)));
      if (hits.length) { found = { page: u, text: hits[0].context.slice(0, 160), dates: hits[0].dates }; break; }
      const lead = all.find(n => neu && recent(n.dates));
      if (lead && !leadFound) leadFound = { page: u, text: lead.context.slice(0, 120) };
      if (neu || first) for (const l of links(html, u, seen, neu ? HINT_NEW : HINT_OLD, neu ? 5 : 3)) { seen.add(l); queue.push(l); }
    }
    first = false; await sleep(2500);
  }
  return { visited: visited.length, found, leadFound, blocked };
}
(async () => {
  const rows = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').slice(1).map(l => l.split(','));
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const [site, college, label, , , , split] of rows) {
    const r = await reach(b, site);
    console.log('READ ' + JSON.stringify({ mode: MODE, college, label, split, reached: !!r.found, lead: r.leadFound?.text, blocked: r.blocked, dates: r.found?.dates, pages: r.visited, page: r.found?.page, text: r.found?.text }));
  }
  await b.close();
})();
