const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
export function parseDate(d: string): Date | null {
  let m = d.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/); if (m) return new Date(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1]);
  m = d.match(/(\d{1,2})(?:st|nd|rd|th)?[\s-]+([A-Za-z]{3})[a-z]*[\s,-]+(\d{2,4})/); if (m) return new Date(+m[3] < 100 ? 2000 + +m[3] : +m[3], MONTHS[m[2].toLowerCase()], +m[1]);
  m = d.match(/([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/); if (m) return new Date(+m[3], MONTHS[m[1].toLowerCase()], +m[2]);
  m = d.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return null;
}
/** 'fresh': undated, or has any date within 45 days of today or later (a future last date keeps an old post alive).
 *  'stale': dates exist but all are older than 45 days. Stale never proves closed: the deadline may sit in a linked PDF
 *  or elsewhere. Callers must skip it for a hiring tag but must not turn it into not_hiring (see downgradeIfStale). */
export function freshness(dates: string[], today: string): 'fresh' | 'stale' {
  const t = new Date(today).getTime();
  const ds = dates.map(parseDate).filter((x): x is Date => !!x && x.getFullYear() >= 2020).map(x => x.getTime());
  if (!ds.length) return 'fresh';
  return ds.some(x => x >= t - 45 * 864e5) ? 'fresh' : 'stale';
}
/** A stale law-faculty-looking notice was set aside, so "not_hiring" is not safe: the answer is unknown. */
export function downgradeIfStale<T extends { status: string; why?: string }>(d: T, staleSeen: boolean): T {
  return staleSeen && d.status === 'not_hiring' ? { ...d, status: 'unknown', why: 'old notice seen, deadline unknown' } : d;
}
