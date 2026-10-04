import * as cheerio from 'cheerio';
import { createRequire } from 'node:module';
import { DATE_RE, type Notice } from './extract';
const pdfParse = createRequire(import.meta.url)('pdf-parse');

async function textOf(url: string): Promise<{ text: string; pdfs: string[] } | null> {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) return null;
  if (/pdf/i.test(r.headers.get('content-type') || '') || /\.pdf(\?|$)/i.test(url)) {
    const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > 15_000_000) return null;
    return { text: String((await pdfParse(buf)).text || '').replace(/\s+/g, ' ').trim(), pdfs: [] };
  }
  const $ = cheerio.load(await r.text()); $('script,style,noscript').remove();
  const pdfs: string[] = [];
  $('a[href]').each((_, a) => { const h = $(a).attr('href') || ''; if (/\.pdf(\?|$)/i.test(h) && /detail|advert|advt|recruit|vacanc|applic/i.test($(a).text() + decodeURIComponent(h))) { try { pdfs.push(new URL(h, url).href); } catch { /* ignore */ } } });
  $('nav,footer,header').remove();
  const main = $('main, article, #content, .content, .entry-content').first();
  return { text: (main.length ? main : $('body')).text().replace(/\s+/g, ' ').trim(), pdfs };
}

/** Open the page or PDF a notice links to and return a fuller notice: the text of that document and every date in it.
 *  If the page is only a title plus a "Detailed Notification" PDF link (Allahabad), the PDF is read too, one level deep.
 *  Returns null when the link cannot be read. */
export async function readDetail(n: Notice): Promise<Notice | null> {
  if (!n.link || /\.(docx?|xlsx?|zip|jpg|png)(\?|$)/i.test(n.link)) return null;
  try {
    const d = await textOf(n.link); if (!d) return null;
    let text = d.text;
    const at = text.toLowerCase().indexOf(n.title.slice(0, 40).toLowerCase(), 200); // skip the site chrome at the top of the page
    if (at > 0) text = text.slice(at);
    let full = text; text = text.slice(0, 1800);
    if (text.length < 500 && d.pdfs.length) { const p = await textOf(d.pdfs[0]).catch(() => null); if (p && p.text.length > 80) { full = `${full} || ${p.text}`; text = `${text} || ${p.text.slice(0, 1800)}`; } }
    // Multi-department advert: the law post can sit far past the first 1800 chars. Add a window around the first law mention.
    const lm = full.slice(1800).search(/\b(school of law|law school|department of law|faculty of law|legal studies|LL\.?\s?[BM]|\blaw\b)/i);
    if (lm >= 0) text = `${text} ... ${full.slice(1800 + Math.max(0, lm - 300), 1800 + lm + 500)}`;
    if (text.length < 80) return null;
    return { title: n.title, context: `${n.title} || ${text}`, link: n.link, dates: text.match(DATE_RE) ?? [] };
  } catch { return null; }
}
