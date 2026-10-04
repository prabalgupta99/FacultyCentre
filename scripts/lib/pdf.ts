import type { Notice } from './extract';
import { DATE_RE } from './extract';
import { createRequire } from 'node:module';
const pdfParse = createRequire(import.meta.url)('pdf-parse');

/** Read a notice PDF into notices: one per mention of law/legal (with ~300 chars around it), dates taken from the whole document.
 *  Needs: npm i pdf-parse@1.1.1. Returns [] on any fetch or parse problem (caller treats the page as unread). */
export async function pdfNotices(url: string, maxBytes = 8_000_000): Promise<Notice[]> {
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(40000) });
    if (!r.ok) return [];
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > maxBytes) return [];
    const text = String((await pdfParse(buf)).text || '').replace(/\s+/g, ' ');
    if (text.length < 200) return [];
    const head = text.slice(0, 400);
    const dates = text.match(DATE_RE) ?? [];
    const out: Notice[] = [];
    const re = /\b(law|legal studies|llb|llm)\b/gi; let m: RegExpExecArray | null; let last = -1000;
    while ((m = re.exec(text)) && out.length < 5) {
      if (m.index - last < 300) continue; last = m.index;
      const ctx = `${head.slice(0, 160)} ... ${text.slice(Math.max(0, m.index - 150), m.index + 200)}`;
      out.push({ title: ctx.slice(0, 200), context: ctx, link: url, dates });
    }
    return out;
  } catch { return []; }
}
