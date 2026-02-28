/**
 * Faculty Centre Career Scraper Logic (Node.js Version)
 * 
 * Implements Exclusion-First Protocol:
 * A college page is presumed NOT hiring until it passes ALL negative filters,
 * date checks, and meets the scoring threshold.
 * 
 * Pipeline: Preprocessing → Negative Filter → Zero State → Date Check → Scoring
 */

import { JSDOM } from 'jsdom';

// ============================================================================
// TYPES & CONFIGURATION
// ============================================================================

export interface HiringStatus {
    is_hiring: boolean;
    reason: string;
    confidence_score: number;
}

const CONFIG = {
    SCORE_THRESHOLD: 25, // Updated to 25 based on user manual edit
    MAX_STALE_DAYS: 90,
    NEGATIVE_KEYWORD_LIMIT: 5,
};

const KEYWORDS = {
    NEGATIVE_FILTER: [
        "result", "shortlist", "selected candidates", "merit list",
        "corrigendum", "archive", "postponed"
    ],
    ZERO_STATE: [
        // Explicit Zero (High Confidence)
        "no current openings", "no vacancies", "no jobs found",
        "no open positions", "no active openings", "no opportunities available",
        "no job listings found", "0 open positions", "openings: 0",
        "currently no vacancies", "vacancies: nil", "number of vacancies: 0",

        // Process Status (Temporal)
        "applications closed", "application window closed", "deadline expired",
        "hiring concluded", "recruitment drive ended", "registrations closed",
        "no longer accepting applications", "process completed",
        "recruitment process closed", "positions filled",

        // Passive/Future (Resume Trap)
        "we are not currently hiring", "drop your cv for future", "apply for future",
        "talent pool only", "future reference only", "keep checking this page",
        "watch this space", "check back later",

        // Indian Academic/Bureaucratic Specifics
        "recruitment notice - archives", "nothing to display", "no data available",
        "no records found", "walk-in interview over", "advertisement withdrawn",
        "cancelled", "corrigendum: cancelled"
    ],
    STRONG_SIGNALS: [
        "walk-in interview", "walk in interview", "applications are invited",
        "advertisement for the post", "recruitment of",
        "click here to apply", "current vacancies", "regular recruitment",
        "contractual recruitment", "advertisement for various", "guest faculty"
    ],
    MEDIUM_SIGNALS: [
        "vacancy", "opening", "teaching post", "non-teaching",
        "assistant professor", "contractual", "project fellow",
        "apply online", "apply now", "date extended",
        "last date extended", "apply for the post"
    ],
    // NEW: Category Headers (Weak Signals: +5 text, +10 link)
    CATEGORY_SIGNALS: [
        "guest faculty recruitment"
    ],
    // NEW: Contact-Based Application Methods (+5 each)
    CONTACT_METHODS: [
        "mail your resume", "send your cv", "email your application",
        "send resume to", "forward cv to", "submit resume at",
        "email cv to", "send application to", "mail cv",
        "applications to be sent", "cv should be sent", "forward your cv"
    ],
    // NEW: Candidate Invitation Language (+5 each)
    INVITATION_LANGUAGE: [
        "are invited to apply", "candidates are invited",
        "interested candidates", "eligible candidates may apply",
        "candidates should apply", "qualified candidates",
        "suitable candidates", "desirous candidates"
    ],
    // NEW: Application Process Terms (+3 each)
    PROCESS_TERMS: [
        "how to apply", "application procedure", "selection process",
        "application form", "registration link", "online application",
        "mode of application", "important instructions",
        "eligibility criteria", "qualification required", "essential qualifications"
    ],
    // NEW: Job Structure Indicators (+5 each)
    JOB_STRUCTURE: [
        "more details", "job description", "detailed advertisement",
        "view details", "read more", "download advertisement",
        "position details", "post details"
    ],
    // NEW: Specific Designations (+3 each)
    SPECIFIC_ROLES: [
        "lecturer", "reader", "registrar", "librarian",
        "director", "dean", "head of department", "hod",
        "coordinator", "placement officer", "admission counsellor"
    ],
    // NEW: Document Requirements (+5 each)
    DOCUMENT_REQUIREMENTS: [
        "attach your cv", "upload resume", "relevant documents",
        "along with cv", "copies of certificates", "supporting documents",
        "experience certificates", "scanned copies"
    ],
    ANCHOR_BOOST_KEYWORDS: [
        "walk-in interview", "walk in interview", "applications are invited",
        "advertisement for the post", "recruitment of", "guest faculty",
        "click here to apply", "vacancy"
    ],
    ANCHOR_PENALTY: ["result", "shortlist"]
};

// ============================================================================
// PHASE 1: PREPROCESSING
// ============================================================================

function preprocessHTML(html: string): { cleanText: string; doc: any; links: Element[] } {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Remove noise elements + NEW Footer Removal
    const noiseElements = doc.querySelectorAll('script, style, nav, footer, noscript, .footer, #footer, .site-footer, .copyright');
    noiseElements.forEach((el) => el.parentNode?.removeChild(el));

    const bodyText = doc.body?.textContent || "";
    const links = Array.from(doc.querySelectorAll('a'));

    // Normalize: lowercase, collapse whitespace
    const cleanText = bodyText
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

    return { cleanText, doc, links };
}

// ============================================================================
// PHASE 2: NEGATIVE FILTERING
// ============================================================================

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

// ============================================================================
// PHASE 3: ZERO STATE CHECK
// ============================================================================

function checkZeroState(text: string, doc: any): HiringStatus | null {
    for (const keyword of KEYWORDS.ZERO_STATE) {
        if (text.includes(keyword)) {
            return {
                is_hiring: false,
                reason: `Explicit Zero-State: "${keyword}" found`,
                confidence_score: -100
            };
        }
    }

    const jobHeaders = [
        "current openings", "teaching jobs", "job openings", "career opportunities",
        "vacancy", "openings", "available positions", "recruitment"
    ];

    for (const header of jobHeaders) {
        if (text.includes(header)) {
            const headerIndex = text.indexOf(header);
            if (headerIndex !== -1) {
                const contentAfterHeader = text.substring(headerIndex + header.length, headerIndex + header.length + 300);
                const words = contentAfterHeader
                    .split(/\s+/)
                    .filter(word => word.length > 3)
                    .filter(word => !['the', 'and', 'for', 'with', 'this', 'that', 'from', 'are', 'will', 'your', 'can'].includes(word));

                if (words.length < 10) {
                    return {
                        is_hiring: false,
                        reason: `Structural Empty State: "${header}" header found but no job content (${words.length} words)`,
                        confidence_score: -100
                    };
                }
            }
        }
    }

    return null;
}

// ============================================================================
// PHASE 4: DATE ANALYSIS
// ============================================================================

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

// ============================================================================
// PHASE 5: SCORING ENGINE
// ============================================================================

function calculateScore(text: string, links: Element[]): { score: number; details: string[] } {
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

    // NEW LOGIC: Category Signals
    for (const keyword of KEYWORDS.CATEGORY_SIGNALS) {
        if (text.includes(keyword)) {
            score += 5;
            details.push(`Category (Text): "${keyword}" (+5)`);

            const isLink = links.some(link => link.textContent?.toLowerCase().includes(keyword));
            if (isLink) {
                score += 5;
                details.push(`Category (Link Boost): "${keyword}" (+5)`);
            }
        }
    }

    for (const keyword of KEYWORDS.CONTACT_METHODS) {
        if (text.includes(keyword)) {
            score += 5;
            details.push(`Contact: "${keyword}" (+5)`);
        }
    }

    for (const keyword of KEYWORDS.INVITATION_LANGUAGE) {
        if (text.includes(keyword)) {
            score += 5;
            details.push(`Invitation: "${keyword}" (+5)`);
        }
    }

    for (const keyword of KEYWORDS.PROCESS_TERMS) {
        if (text.includes(keyword)) {
            score += 3;
            details.push(`Process: "${keyword}" (+3)`);
        }
    }

    for (const keyword of KEYWORDS.JOB_STRUCTURE) {
        if (text.includes(keyword)) {
            score += 5;
            details.push(`Structure: "${keyword}" (+5)`);
        }
    }

    for (const keyword of KEYWORDS.SPECIFIC_ROLES) {
        if (text.includes(keyword)) {
            score += 3;
            details.push(`Role: "${keyword}" (+3)`);
        }
    }

    for (const keyword of KEYWORDS.DOCUMENT_REQUIREMENTS) {
        if (text.includes(keyword)) {
            score += 5;
            details.push(`Document: "${keyword}" (+5)`);
        }
    }

    const positionKeywords = [
        "professor", "lecturer", "faculty", "instructor",
        "counsellor", "counselor", "manager", "coordinator",
        "registrar", "librarian", "director", "dean"
    ];
    let positionCount = 0;
    for (const keyword of positionKeywords) {
        if (text.includes(keyword)) positionCount++;
    }
    if (positionCount >= 5) {
        score += 8;
        details.push(`Multiple positions (${positionCount}) (+8)`);
    } else if (positionCount >= 3) {
        score += 5;
        details.push(`Multiple positions (${positionCount}) (+5)`);
    }

    if (text.includes('@') && text.includes('.')) {
        const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
        if (emailPattern.test(text)) {
            score += 3;
            details.push(`Email contact present (+3)`);
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

// ============================================================================
// MAIN EXPORT
// ============================================================================

export function analyzeCareerPage(html: string): HiringStatus {
    try {
        const { cleanText, doc, links } = preprocessHTML(html);

        const negativeResult = checkNegativeFilter(cleanText);
        if (negativeResult) return negativeResult;

        const zeroStateResult = checkZeroState(cleanText, doc);
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
