/**
 * Local Test Script for Exclusion-First Career Logic
 * 
 * Tests the logic against specification scenarios:
 * - Asian Law College (Generic Career header, no jobs)
 * - Axis Colleges (Apply form + "No Current Openings")
 * - Symbiosis Law (Current Openings header but empty)
 * - Bennett University (Valid list but dates expired)
 */

import { JSDOM } from 'jsdom';

// ============================================================================
// CONFIGURATION (Mirrored from logic.ts)
// ============================================================================

interface HiringStatus {
    is_hiring: boolean;
    reason: string;
    confidence_score: number;
}

const CONFIG = {
    SCORE_THRESHOLD: 25,
    MAX_STALE_DAYS: 90,
    NEGATIVE_KEYWORD_LIMIT: 5,
};

const KEYWORDS = {
    NEGATIVE_FILTER: [
        "result", "shortlist", "selected candidates", "merit list",
        "corrigendum", "archive", "postponed"
    ],
    ZERO_STATE: [
        "no current openings", "no vacancies", "no jobs found",
        "recruitment process closed", "positions filled"
    ],
    STRONG_SIGNALS: [
        "walk-in interview", "walk in interview", "applications are invited",
        "advertisement for the post", "recruitment of", "guest faculty",
        "apply online", "click here to apply"
    ],
    MEDIUM_SIGNALS: [
        "vacancy", "opening", "teaching post", "non-teaching",
        "assistant professor", "contractual", "project fellow"
    ],
    ANCHOR_BOOST_KEYWORDS: [
        "walk-in interview", "walk in interview", "applications are invited",
        "advertisement for the post", "recruitment of", "guest faculty",
        "apply online", "click here to apply", "vacancy"
    ],
    ANCHOR_PENALTY: ["result", "shortlist"]
};

// ============================================================================
// LOGIC (Node.js version with jsdom)
// ============================================================================

function preprocessHTML(html: string): { cleanText: string; doc: any; links: any[] } {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Remove noise elements
    const noiseElements = doc.querySelectorAll('script, style, nav, footer, noscript');
    noiseElements.forEach(el => el.parentNode?.removeChild(el));

    const bodyText = doc.body?.textContent || "";
    const links = Array.from(doc.querySelectorAll('a'));

    const cleanText = bodyText
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

    return { cleanText, doc, links };
}

function checkNegativeFilter(text: string): HiringStatus | null {
    let negativeCount = 0;

    for (const keyword of KEYWORDS.NEGATIVE_FILTER) {
        const regex = new RegExp(keyword, 'gi');
        const matches = text.match(regex);
        if (matches) negativeCount += matches.length;
    }

    if (negativeCount > CONFIG.NEGATIVE_KEYWORD_LIMIT) {
        return {
            is_hiring: false,
            reason: `Result/Archive Farm detected (${negativeCount} negative keywords)`,
            confidence_score: -100
        };
    }

    return null;
}

function checkZeroState(text: string): HiringStatus | null {
    for (const keyword of KEYWORDS.ZERO_STATE) {
        if (text.includes(keyword)) {
            return {
                is_hiring: false,
                reason: `Explicit Zero-State: "${keyword}" found`,
                confidence_score: -100
            };
        }
    }

    return null;
}

interface ParsedDate {
    date: Date;
    rawText: string;
}

function parseDates(text: string): ParsedDate[] {
    const dates: ParsedDate[] = [];

    const pattern1 = /\b(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})\b/g;
    let match1;
    while ((match1 = pattern1.exec(text)) !== null) {
        const day = parseInt(match1[1]);
        const month = parseInt(match1[2]);
        let year = parseInt(match1[3]);

        if (year < 100) year += 2000;
        if (month > 12 || month < 1 || day > 31 || day < 1) continue;

        const parsedDate = new Date(year, month - 1, day);
        if (parsedDate.getDate() !== day || parsedDate.getMonth() !== month - 1) continue;

        dates.push({ date: parsedDate, rawText: match1[0] });
    }

    const pattern2 = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/gi;
    let match2;
    while ((match2 = pattern2.exec(text)) !== null) {
        const day = parseInt(match2[1]);
        const monthMap: Record<string, number> = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        };
        const month = monthMap[match2[2].toLowerCase().substring(0, 3)];
        const year = parseInt(match2[3]);

        const parsedDate = new Date(year, month, day);
        if (parsedDate.getDate() !== day || parsedDate.getMonth() !== month) continue;

        dates.push({ date: parsedDate, rawText: match2[0] });
    }

    return dates;
}

function checkDateRequirements(text: string): HiringStatus | null {
    const dates = parseDates(text);

    if (dates.length === 0) return null;

    const currentDate = new Date();
    const oneDayAgo = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    const staleCutoff = new Date(currentDate.getTime() - CONFIG.MAX_STALE_DAYS * 24 * 60 * 60 * 1000);

    const sortedDates = dates.sort((a, b) => b.date.getTime() - a.date.getTime());
    const latestDate = sortedDates[0].date;

    if (latestDate < staleCutoff) {
        return {
            is_hiring: false,
            reason: `Stale content (Latest date: ${latestDate.toLocaleDateString()}, >90 days old)`,
            confidence_score: -50
        };
    }

    const allExpired = dates.every(d => d.date < oneDayAgo);

    if (allExpired) {
        return {
            is_hiring: false,
            reason: `All deadlines expired (Latest: ${latestDate.toLocaleDateString()})`,
            confidence_score: -50
        };
    }

    return null;
}

function calculateScore(text: string, links: any[]): { score: number; details: string[] } {
    let score = 0;
    const details: string[] = [];

    for (const keyword of KEYWORDS.STRONG_SIGNALS) {
        if (text.includes(keyword)) {
            score += 30;
            details.push(`Strong: "${keyword}" (+30)`);
        }
    }

    for (const keyword of KEYWORDS.MEDIUM_SIGNALS) {
        if (text.includes(keyword)) {
            score += 10;
            details.push(`Medium: "${keyword}" (+10)`);
        }
    }

    const currentYear = new Date().getFullYear();
    const academicYear1 = `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
    const academicYear2 = `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;

    for (const link of links) {
        const href = link.getAttribute('href')?.toLowerCase() || '';
        const linkText = link.textContent?.toLowerCase() || '';

        if (href.endsWith('.pdf') || href.endsWith('.jpg') || href.endsWith('.jpeg')) {
            let hasPenalty = false;
            for (const penaltyWord of KEYWORDS.ANCHOR_PENALTY) {
                if (linkText.includes(penaltyWord)) {
                    score -= 50;
                    details.push(`PDF Penalty: "${penaltyWord}" in link (-50)`);
                    hasPenalty = true;
                    break;
                }
            }

            if (!hasPenalty) {
                const hasKeyword = KEYWORDS.ANCHOR_BOOST_KEYWORDS.some(kw => linkText.includes(kw));
                const hasYear = linkText.includes(currentYear.toString()) ||
                    linkText.includes(academicYear1) ||
                    linkText.includes(academicYear2);

                if (hasKeyword && hasYear) {
                    score += 50;
                    details.push(`PDF Boost: Hiring keyword + current year in link (+50)`);
                }
            }
        }
    }

    return { score, details };
}

function analyzeCareerPage(html: string): HiringStatus {
    try {
        const { cleanText, doc, links } = preprocessHTML(html);

        const negativeResult = checkNegativeFilter(cleanText);
        if (negativeResult) return negativeResult;

        const zeroStateResult = checkZeroState(cleanText);
        if (zeroStateResult) return zeroStateResult;

        const dateResult = checkDateRequirements(cleanText);
        if (dateResult) return dateResult;

        const { score, details } = calculateScore(cleanText, links);

        const isHiring = score >= CONFIG.SCORE_THRESHOLD;

        return {
            is_hiring: isHiring,
            reason: isHiring
                ? `Score ${score} >= threshold (${CONFIG.SCORE_THRESHOLD}). Signals: ${details.join('; ')}`
                : `Score ${score} < threshold (${CONFIG.SCORE_THRESHOLD}). Insufficient signals.`,
            confidence_score: score
        };

    } catch (error: any) {
        return {
            is_hiring: false,
            reason: `Analysis error: ${error.message}`,
            confidence_score: -999
        };
    }
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

const TEST_CASES = [
    {
        name: "Asian Law College (Generic Career, no jobs)",
        html: `
      <html>
        <body>
          <h1>Career</h1>
          <p>Welcome to our careers page.</p>
          <h2>Online Application Form</h2>
          <form>
            <input type="text" placeholder="Name" />
            <button>Submit</button>
          </form>
        </body>
      </html>
    `,
        expected: false,
        reason: "No strong signals, generic 'Online Application Form'"
    },
    {
        name: "Axis Colleges (Apply form + No Current Openings)",
        html: `
      <html>
        <body>
          <h1>Apply Online</h1>
          <div style="color: red;">
            <strong>No Current Openings Found !</strong>
          </div>
          <form>
            <input type="text" placeholder="Email" />
          </form>
        </body>
      </html>
    `,
        expected: false,
        reason: "Zero State Check triggered"
    },
    {
        name: "Symbiosis Law (Current Openings header but empty)",
        html: `
      <html>
        <body>
          <h1>Current Openings</h1>
          <aside>
            <h3>Teaching Jobs</h3>
          </aside>
          <div class="jobs-list">
            <!-- Empty -->
          </div>
        </body>
      </html>
    `,
        expected: false,
        reason: "Score 20 (Medium keywords 'opening' + 'teaching') < threshold 25"
    },
    {
        name: "Bennett University (Valid list, dates expired)",
        html: `
      <html>
        <body>
          <h1>Faculty Recruitment</h1>
          <table>
            <tr>
              <td>Assistant Professor (CSE)</td>
              <td>Last Date: 31-12-2025</td>
            </tr>
            <tr>
              <td>Associate Professor (Law)</td>
              <td>Last Date: 25-12-2025</td>
            </tr>
          </table>
        </body>
      </html>
    `,
        expected: false,
        reason: "All deadlines expired (current date > 17-Jan-2026)"
    }
];

// ============================================================================
// TEST RUNNER
// ============================================================================

console.log("🚀 Running Exclusion-First Logic Tests\n");
console.log(`Current Date: ${new Date().toLocaleDateString()}\n`);

let passed = 0;

for (const test of TEST_CASES) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST: ${test.name}`);
    console.log(`${'='.repeat(60)}`);

    const result = analyzeCareerPage(test.html);

    console.log(`Expected: ${test.expected ? 'HIRING' : 'NOT HIRING'}`);
    console.log(`Got:      ${result.is_hiring ? 'HIRING' : 'NOT HIRING'}`);
    console.log(`Score:    ${result.confidence_score}`);
    console.log(`Reason:   ${result.reason}`);

    const match = result.is_hiring === test.expected;

    if (match) {
        console.log(`✅ PASS - ${test.reason}`);
        passed++;
    } else {
        console.log(`❌ FAIL - Expected ${test.expected ? 'HIRING' : 'NOT HIRING'}`);
    }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`SUMMARY: ${passed}/${TEST_CASES.length} tests passed`);
console.log(`${'='.repeat(60)}\n`);
