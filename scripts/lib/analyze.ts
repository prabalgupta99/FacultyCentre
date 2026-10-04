import * as cheerio from 'cheerio';
import type { Browser } from '@playwright/test';
import { extractNotices, prefilter, pageReadable, type Notice } from './extract';
import { decide, type Judged, type Status } from './decide';
import { judge } from './jev';
import { pdfNotices } from './pdf';
import { freshness, downgradeIfStale } from './fresh';
const LAWISH = /\blaw\b|legal|\bllb\b|\bllm\b/i;


const MAX_NOTICES = Number(process.env.MAX_NOTICES || 5);
const LINK_HINT = /(notices?|announcements?|latest|what.?s new|recruitment|career|vacanc|opening|jobs?\b|walk.?in|advertis|notification|join.?us|faculty|teaching|employment|apply)/i;
const NOT_PAGE = /(non[-_ ]?teaching|\/people|\/faculty\/|\/staff|\/team|login|signin|register)/i;
const SKIP_LINK = /\.(jpg|jpeg|png|gif|zip|docx?|xlsx?)(\?|$)|^(mailto|tel|javascript):/i;

export type Verdict = { url: string; status: Status; why: string; http: number | null; err?: string; via: string[]; evidence?: Notice; answers?: any; role?: string; notices: number; jevCalls: number };

async function load(browser: Browser, url: string) {
  const page = await browser.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    return { http: resp?.status() ?? null, html: await page.content() };
  } finally { await page.close(); }
}

function hintLinks(html: string, base: string, seen: Set<string>): string[] {
  const $ = cheerio.load(html); const out: string[] = [];
  $('a[href]').each((_, a) => {
    const href = $(a).attr('href') || ''; const text = $(a).text().replace(/\s+/g, ' ').trim();
    if (SKIP_LINK.test(href) || NOT_PAGE.test(href) || !(LINK_HINT.test(text) || LINK_HINT.test(href))) return;
    try { const u = new URL(href, base); u.hash = ''; const s = u.href;
      if (!seen.has(s) && !out.includes(s) && /^https?:/.test(s) && new URL(base).hostname.split('.').slice(-2).join('.') === u.hostname.split('.').slice(-2).join('.')) out.push(s);
    } catch { /* ignore */ }
  });
  return out.slice(0, 5);
}

/** One URL in, one verdict out. Fetch and safety rules are deterministic; the judgement on each notice is Jev. */
export async function analyzeUrl(browser: Browser, url: string, name: string, today: string, cached?: { http: number | null; html: string }): Promise<Verdict> {
  const v: Verdict = { url, status: 'unknown', why: '', http: null, via: [url], notices: 0, jevCalls: 0 };
  if (!/^https?:\/\//i.test(url)) { v.why = 'invalid url'; return v; }
  if (/\.docx?(\?|$)/i.test(url)) { v.why = 'word document link, not read'; return v; }
  let staleSeen = false;
  const keepFresh = (n: Notice) => { if (freshness(n.dates, today) === 'fresh') return true; if (LAWISH.test(n.context)) staleSeen = true; return false; };
  const seen = new Set<string>([url]);
  const queue: string[] = []; let first = true; let judgedAll: Judged[] = []; let anyReadable = false;
  let current = url;
  for (let hop = 0; hop < 8; hop++) {
    let http: number | null = null, html = '';
    if (/\.pdf(\?|$)/i.test(current)) {
      // linked or direct PDF: read its text, notices around law/legal mentions, dates from the whole file
      const pn = (await pdfNotices(current)).filter(n => keepFresh(n)).slice(0, MAX_NOTICES);
      if (pn.length) anyReadable = true;
      v.notices += pn.length;
      for (const n of pn) { judgedAll.push({ n, a: await judge(n, today, name) }); v.jevCalls++; }
      const dp: any = decide(judgedAll, anyReadable, name);
      if (dp.status === 'hiring') { Object.assign(v, { status: 'hiring', why: dp.why, evidence: dp.evidence, answers: dp.answers, role: dp.role }); return v; }
      first = false; const nextp = queue.shift(); if (!nextp) break; current = nextp; v.via.push(nextp); continue;
    }
    try {
      if (first && cached) ({ http, html } = cached); else ({ http, html } = await load(browser, current));
    } catch (e: any) { if (first) { v.err = String(e.message).slice(0, 160); v.why = 'error'; } }
    if (first) v.http = http;
    const readable = pageReadable(http, html); anyReadable = anyReadable || readable;
    if (readable) {
      const notices = extractNotices(html, current).filter(prefilter).filter(n => keepFresh(n)).slice(0, MAX_NOTICES);
      v.notices += notices.length;
      for (const n of notices) { const a0 = await judge(n, today, name); judgedAll.push({ n, a: a0 }); v.jevCalls++; { const x: any = a0; console.log('NOTICE ' + JSON.stringify({ t: n.title.slice(0, 70), job: x.is_job_notice?.noul, st: x.stream?.choice + ':' + x.stream?.confidence, ro: x.role_type?.choice, su: x.status?.choice + ':' + x.status?.confidence, raw: x.raw })); } if ((decide(judgedAll, true, name) as any).status === 'hiring') break; }
      const d: any = decide(judgedAll, true, name);
      if (d.status === 'hiring') { Object.assign(v, { status: 'hiring', why: d.why, evidence: d.evidence, answers: d.answers, role: d.role }); return v; }
      for (const l of hintLinks(html, current, seen)) { queue.push(l); seen.add(l); }
    }
    first = false;
    const next = queue.shift(); if (!next) break;
    current = next; v.via.push(next);
  }
  const d: any = downgradeIfStale(decide(judgedAll, anyReadable, name) as any, staleSeen);
  if (v.err && !anyReadable) { v.why = 'error'; return v; }
  Object.assign(v, { status: d.status, why: d.why, ...(d.lead ? { evidence: d.evidence, answers: d.answers, role: d.role } : {}) });
  return v;
}
