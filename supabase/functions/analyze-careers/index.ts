
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- CONFIGURATION ---

const STRONG_POSITIVE_KEYWORDS = [
    "job opening", "vacancy", "vacancies", "career opportunity", "career opportunities",
    "walk-in interview", "applications invited", "invite applications", "advertisement no", "employment notice",
    "apply online", "click here to apply", "apply now", "submit application", "work with us",
    "current openings", "open positions", "recruitment advertisement"
];

const WEAK_POSITIVE_KEYWORDS = [
    "assistant professor", "associate professor", "professor",
    "faculty recruitment", "faculty position", "teaching position", "academic position",
    "guest faculty", "visiting faculty", "contractual faculty"
];

const EXPLICIT_NOT_HIRING_KEYWORDS = [
    "no vacancy", "no vacancies", "no job opening", "no job openings",
    "no current openings", "no positions available", "no jobs available",
    "not hiring", "applications closed", "currently no openings",
    "recruitment closed", "no advertisement"
];

// Removed neutral terms like "admission", "student"
const NEGATIVE_KEYWORDS = [
    "result", "results", "shortlist", "shortlisted", "selected candidates", "provisional list",
    "interview schedule", "call letter", "admit card",
    "corrigendum", "addendum", "cancellation", "postponed",
    "tender", "quotation", "procurement"
];

// --- LOGIC ---

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { url } = await req.json();

        if (!url) {
            throw new Error("URL is required");
        }

        console.log(`Analyzing: ${url}`);

        // 1. Fetch the page
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();

        // 2. Parse HTML
        const doc = new DOMParser().parseFromString(html, "text/html");
        if (!doc) throw new Error("Failed to parse HTML");

        // Remove scripts and styles
        const scripts = doc.querySelectorAll('script, style, nav, footer, noscript');
        scripts.forEach(s => {
            if (s.parentNode) s.parentNode.removeChild(s);
        });

        const bodyText = doc.body ? doc.body.textContent.toLowerCase() : "";
        const title = doc.querySelector('title')?.textContent.toLowerCase() || "";

        // Link Text Analysis
        const links = doc.querySelectorAll('a');
        let linkTextContent = "";
        links.forEach(l => {
            linkTextContent += " " + (l.textContent.toLowerCase() || "");
        });

        const fullText = bodyText + " " + linkTextContent;

        // 3. Analysis
        let score = 0;
        const reasons: string[] = [];

        // Check for negative context first
        if (title.includes("result") || title.includes("shortlist") || title.includes("archive")) {
            score -= 50;
            reasons.push("Page Title indicates Results/Archive");
        }

        let strongCount = 0;
        let weakCount = 0;
        let negativeCount = 0;
        let explicitNotHiringCount = 0;

        // Check Explicit Not Hiring First
        EXPLICIT_NOT_HIRING_KEYWORDS.forEach(kw => {
            if (fullText.includes(kw)) {
                explicitNotHiringCount++;
                score -= 100; // Massive Penalty
                reasons.push(`Found EXPLICIT NOT HIRING keyword: "${kw}"`);
            }
        });

        STRONG_POSITIVE_KEYWORDS.forEach(kw => {
            if (fullText.includes(kw)) {
                strongCount++;
                score += 30;
                reasons.push(`Found STRONG positive keyword: "${kw}"`);
            }
        });

        WEAK_POSITIVE_KEYWORDS.forEach(kw => {
            if (fullText.includes(kw)) {
                weakCount++;
                score += 5;
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

        // HEAVY PENALTY for Result Farms
        if (negativeCount > 5) {
            score -= 100;
            reasons.push("Explicitly penalized for excessive negative keywords (Results/Archive page)");
        }

        // Date Analysis
        const currentYear = new Date().getFullYear();
        const lastYear = currentYear - 1;
        const nextYear = currentYear + 1;

        if (fullText.includes(currentYear.toString()) || fullText.includes(nextYear.toString())) {
            score += 10;
            reasons.push(`Found current/next year reference`);
        } else if (fullText.includes(lastYear.toString())) {
            score += 0;
        } else {
            score -= 10;
            reasons.push("No recent year references found");
        }

        if (strongCount === 0 && weakCount === 0) {
            score = -100;
            reasons.push("No positive keywords found - enforcing Not Hiring");
        }

        // Final check: If explicit not hiring keywords found, override positive score
        if (explicitNotHiringCount > 0) {
            score = Math.min(score, -50); // Ensure it stays negative even if positive keywords found
            reasons.push("Explicit 'Not Hiring' signal overrides positive keywords");
        }

        // Heuristic Threshold
        const isHiring = score > 15;

        return new Response(JSON.stringify({
            isHiring,
            score,
            reasons,
            debug: { strongCount, weakCount, negativeCount, explicitNotHiringCount, length: fullText.length }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
