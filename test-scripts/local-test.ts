
import { JSDOM } from 'jsdom';

// --- CONFIGURATION ---

// Strong signals of ACTIVE hiring intent
const STRONG_POSITIVE_KEYWORDS = [
    "job opening", "vacancy", "vacancies", "career opportunity", "career opportunities",
    "walk-in interview", "applications invited", "invite applications", "advertisement no", "employment notice",
    "apply online", "click here to apply", "apply now", "submit application", "work with us",
    "current openings", "open positions", "recruitment advertisement"
];

// Weak signals (Job titles that could just be in a staff list or archive)
const WEAK_POSITIVE_KEYWORDS = [
    "assistant professor", "associate professor", "professor",
    "faculty position", "teaching position", "academic position",
    "guest faculty", "visiting faculty", "contractual faculty"
];

const NEGATIVE_KEYWORDS = [
    "result", "results", "shortlist", "shortlisted", "selected candidates", "provisional list",
    "interview schedule", "call letter", "admit card",
    "corrigendum", "addendum", "cancellation", "postponed",
    "tender", "quotation", "procurement"
];

async function analyzeUrl(url: string) {
    console.log(`\nAnalyzing: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        });

        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

        const html = await response.text();
        const dom = new JSDOM(html);
        const doc = dom.window.document;

        // Cleanup
        const scripts = doc.querySelectorAll('script, style, nav, footer, noscript');
        scripts.forEach(s => s.parentNode?.removeChild(s));

        const bodyText = doc.body ? doc.body.textContent?.toLowerCase() || "" : "";
        const title = doc.querySelector('title')?.textContent?.toLowerCase() || "";

        const links = doc.querySelectorAll('a');
        let linkTextContent = "";
        links.forEach(l => {
            linkTextContent += " " + (l.textContent?.toLowerCase() || "");
        });

        const fullText = bodyText + " " + linkTextContent;

        // --- LOGIC ---
        let score = 0;
        const reasons: string[] = [];

        if (title.includes("result") || title.includes("shortlist") || title.includes("archive")) {
            score -= 50;
            reasons.push("Page Title indicates Results/Archive");
        }

        let strongCount = 0;
        let weakCount = 0;
        let negativeCount = 0;

        STRONG_POSITIVE_KEYWORDS.forEach(kw => {
            if (fullText.includes(kw)) {
                strongCount++;
                score += 30; // High reward
                reasons.push(`Found STRONG positive keyword: "${kw}"`);
            }
        });

        WEAK_POSITIVE_KEYWORDS.forEach(kw => {
            if (fullText.includes(kw)) {
                weakCount++;
                score += 5; // Low reward (adds up, but needs many to pass alone)
                reasons.push(`Found weak positive keyword: "${kw}"`);
            }
        });

        NEGATIVE_KEYWORDS.forEach(kw => {
            const regex = new RegExp(kw, 'g');
            const count = (fullText.match(regex) || []).length;
            if (count > 0) {
                negativeCount += count;
                score -= (5 * count);
            }
        });

        if (negativeCount > 0) reasons.push(`Found ${negativeCount} occurrences of negative keywords`);

        // HEAVY PENALTY for "Result Farm" pages
        if (negativeCount > 5) {
            score -= 100;
            reasons.push("Explicitly penalized for excessive negative keywords (Results/Archive page)");
        }

        const currentYear = new Date().getFullYear();
        const lastYear = currentYear - 1;
        const nextYear = currentYear + 1;

        if (fullText.includes(currentYear.toString()) || fullText.includes(nextYear.toString())) {
            score += 10; // Reduced influence of year
            reasons.push(`Found current/next year reference`);
        } else if (fullText.includes(lastYear.toString())) {
            score += 0;
        } else {
            score -= 10;
        }

        if (strongCount === 0 && weakCount === 0) {
            score = -100;
            reasons.push("No positive keywords found");
        }

        const isHiring = score > 15;
        return { isHiring, score, reasons, error: null };

    } catch (e: any) {
        return { isHiring: false, score: 0, reasons: [], error: e.message };
    }
}

// --- TEST RUNNER ---
const TEST_URLS = [
    { url: 'https://www.nujs.edu/careers', expected: false, type: 'Known Archive' },
    { url: 'https://www.hlmgroup.org/career', expected: true, type: 'User Provided Hiring' }
];

async function run() {
    console.log("🚀 Starting LOCAL Heuristic Logic Tests (Tiered Scoring)...\n");
    let passed = 0;

    for (const test of TEST_URLS) {
        console.log(`Testing: ${test.url} (${test.type})`);
        const result = await analyzeUrl(test.url);

        if (result.error) {
            console.log(`  ⚠️ ERROR: ${result.error}`);
        } else {
            const match = result.isHiring === test.expected;
            console.log(`  Result: ${result.isHiring ? "HIRING" : "NOT HIRING"} (Score: ${result.score})`);
            console.log(`  Expected: ${test.expected ? "HIRING" : "NOT HIRING"}`);

            if (match) {
                console.log("  ✅ PASS");
                passed++;
            } else {
                console.log("  ❌ FAIL");
                console.log("  Reasoning:", result.reasons);
            }
        }
        console.log("-----------------------------------");
    }
    console.log(`\nTest Summary: ${passed}/${TEST_URLS.length} Passed`);
}

run();
