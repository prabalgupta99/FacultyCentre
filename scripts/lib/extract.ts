import * as cheerio from 'cheerio';

export type Notice = { title: string; context: string; link: string | null; dates: string[]; fromWindow?: boolean };

export const DATE_RE = /\b(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?[\s-]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,-]+\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{4}-\d{2}-\d{2})\b/gi;

const JOBISH = /(recruit|vacanc|post of|posts of|walk.?in|applications? (are )?invited|call for applications|advertisement|assistant professor|associate professor|professor|guest faculty|lecturer|teaching associate|fellow|project (staff|assistant)|engagement of|appointment)/i;
const NOT_JOB = /(admission|tender|quotation|convocation|scholarship|seminar|workshop|conference|newsletter|annual report)/i;
const FORM_FIELD = /--\s*select\s*--|position applied for|choose (a )?position|this field is required|^\s*select\b/i; // application-form dropdowns are not notices (mistake log: Chotanagpur false hiring)
const CANCELLED = /\bcancel|postpone|re-?schedul|corrigendum|\bresult\b|merit list|shortlist|revised date|extension of/i;
export const prefilter = (n: Notice) => JOBISH.test(n.context) && !NOT_JOB.test(n.title) && !CANCELLED.test(n.title + ' ' + n.context.slice(0, 160)) && !FORM_FIELD.test(n.title + ' ' + n.context.slice(0, 120));

/** Notices = table rows, list items, article blocks and links with enough text.
 *  If a notice has no date inside it, look at its parent block (<= 600 chars) so a date shown beside it is not lost. */
export function extractNotices(html: string, pageUrl: string): Notice[] {
  const $ = cheerio.load(html);
  $('script,style,noscript,nav,footer,header').remove();
  const seen = new Set<string>();
  const out: Notice[] = [];
  $('tr, li, article, .views-row, a, p, h1, h2, h3, h4, h5, h6, td, div:not(:has(div,p,li,table,ul,ol,tr,h1,h2,h3,h4,h5,h6))').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length < 25 || text.length > 700) return;
    const key = text.slice(0, 120).toLowerCase();
    if (seen.has(key) || out.some(o => o.context.includes(text))) return;
    seen.add(key);
    const href = $(el).is('a') ? $(el).attr('href') : $(el).find('a[href]').first().attr('href');
    let link: string | null = null;
    try { link = href ? new URL(href, pageUrl).href : null; } catch { /* ignore */ }
    let dates = text.match(DATE_RE) ?? [];
    if (!dates.length) {
      const parentText = $(el).parent().text().replace(/\s+/g, ' ').trim();
      if (parentText.length <= 600) dates = parentText.match(DATE_RE) ?? [];
    }
    out.push({ title: text.slice(0, 200), context: text, link, dates });
  });
  return out;
}

/** A page counts as read only if it returned a normal status and enough text. */
export const pageReadable = (http: number | null, html: string) => !!http && http < 400 && html.replace(/<[^>]+>/g, '').length > 800;

// Law windows: text around a law unit/domain mention on a page that also shows a faculty-hiring cue. Judged by the model like a notice,
// but flagged fromWindow so it can only raise a review lead, never a hiring tag.
const W_FAC = /faculty\s+(hiring|recruitment|positions?|vacanc\w+|openings?)|(hiring|recruiting|vacanc\w+|openings?|positions?)\s+(for|of|in)\s+(the\s+)?(faculty|professor|assistant professor)|\bapply\b[^.]{0,120}(faculty|professor|lecturer)|(faculty|professor|lecturer|teaching)[^.]{0,200}(applications?\s+(are\s+)?invit|vacanc|recruit|hiring|openings?)/i;
const W_LAW = /(school|department|faculty|college|centre|center) of (law|legal studies)|law (school|domains?|department|faculty)|core law|\blaw\s*:|\b(llb|llm)\b|\blaw\b[^.]{0,40}(specialisation|specialization|discipline)|(specialisation|specialization|discipline)s?[^.]{0,80}\blaw\b/gi;
export function lawWindows(html: string, institution = '', max = 2): Notice[] {
  const $ = cheerio.load(html); $('script,style,noscript,select,option').remove();
  let text = $('body').text().replace(/\s+/g, ' ').trim();
  for (const w of institution.split(/[,|-]/).map(x => x.trim()).filter(x => x.length > 5)) text = text.split(w).join(' ');
  if (text.length < 300 || !W_FAC.test(text)) return [];
  const out: Notice[] = []; let last = -1e9; let m: RegExpExecArray | null; W_LAW.lastIndex = 0;
  while ((m = W_LAW.exec(text)) && out.length < max) {
    if (m.index - last < 600) continue; last = m.index;
    const ctx = text.slice(Math.max(0, m.index - 250), m.index + 350);
    out.push({ title: ctx.slice(0, 120), context: ctx, link: null, dates: (ctx.match(DATE_RE) || []).slice(0, 3), fromWindow: true });
  }
  return out;
}
