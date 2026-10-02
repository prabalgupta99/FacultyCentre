import * as cheerio from 'cheerio';
import type { Browser } from '@playwright/test';
import { extractNotices, prefilter, pageReadable, type Notice } from './extract';
import { decide, type Judged, type Status } from './decide';
import { judge } from './jev';

const MAX_NOTICES = Number(process.env.MAX_NOTICES || 5);
const LINK_HINT = /(career|recruit|vacanc|opening|jobs?\b|walk.?in|advertis|notification|join.?us)/i;
const NOT_PAGE = /(\/people|\/faculty\/|\/staff|\/team|login|signin|register)/i;
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
  return out.slice(0, 3);
}

/** One URL in, one verdict out. Fetch and safety rules are deterministic; the judgement on each notice is Jev. */
export async function analyzeUrl(browser: Browser, url: string, name: string, today: string, cached?: { http: number | null; html: string }): Promise<Verdict> {
  const v: Verdict = { url, status: 'unknown', why: '', http: null, via: [url], notices: 0, jevCalls: 0 };
  if (!/^https?:\/\//i.test(url)) { v.why = 'invalid url'; return v; }
  if (/\.(pdf|docx?)(\?|$)/i.test(url)) { v.why = 'pdf or document link, not read'; return v; }
  const seen = new Set<string>([url]);
  const queue: string[] = []; let first = true; let judgedAll: Judged[] = []; let anyReadable = false;
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    let http: number | null = null, html = '';
    try {
      if (first && cached) ({ http, html } = cached); else ({ http, html } = await load(browser, current));
    } catch (e: any) { if (first) { v.err = String(e.message).slice(0, 160); v.why = 'error'; } }
    if (first) v.http = http;
    const readable = pageReadable(http, html); anyReadable = anyReadable || readable;
    if (readable) {
      const notices = extractNotices(html, current).filter(prefilter).slice(0, MAX_NOTICES);
      v.notices += notices.length;
      for (const n of notices) { const a0 = await judge(n, today, name); judgedAll.push({ n, a: a0 }); v.jevCalls++; { const x: any = a0; console.log('NOTICE ' + JSON.stringify({ t: n.title.slice(0, 70), job: x.is_job_notice?.noul, st: x.stream?.choice + ':' + x.stream?.confidence, ro: x.role_type?.choice, su: x.status?.choice + ':' + x.status?.confidence, raw: x.raw })); } if ((decide(judgedAll, true) as any).status === 'hiring') break; }
      const d: any = decide(judgedAll, true);
      if (d.status === 'hiring') { Object.assign(v, { status: 'hiring', why: d.why, evidence: d.evidence, answers: d.answers, role: d.role }); return v; }
      if (first) for (const l of hintLinks(html, current, seen)) { queue.push(l); seen.add(l); }
    }
    first = false;
    const next = queue.shift(); if (!next) break;
    current = next; v.via.push(next);
  }
  const d: any = decide(judgedAll, anyReadable);
  if (v.err && !anyReadable) { v.why = 'error'; return v; }
  Object.assign(v, { status: d.status, why: d.why, ...(d.lead ? { evidence: d.evidence, answers: d.answers, role: d.role } : {}) });
  return v;
}
