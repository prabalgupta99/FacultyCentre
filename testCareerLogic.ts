
// Standalone Test Script - No internal dependencies
const LOCAL_FUNCTION_URL = "http://localhost:54321/functions/v1/analyze-careers";

async function analyzeDirectly(targetUrl: string) {
    try {
        const response = await fetch(LOCAL_FUNCTION_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: targetUrl })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Edge Function Error ${response.status}: ${text}`);
        }

        return await response.json();
    } catch (e: any) {
        throw e;
    }
}

const TEST_URLS = [
    { url: 'https://www.nls.ac.in/careers', expected: true, type: 'Known Hiring' },
    { url: 'https://www.symlaw.ac.in/careers', expected: false, type: 'Known Not Hiring / Generic' },
    { url: 'https://www.nujs.edu/careers', expected: false, type: 'Known Archive' },
    { url: 'https://www.hlmgroup.org/career', expected: true, type: 'User Provided Hiring' }
];

async function runTests() {
    console.log("🚀 Starting Automated Career Logic Tests (Direct to Edge Function)...\n");
    let passed = 0;

    for (const test of TEST_URLS) {
        console.log(`Testing: ${test.url} (${test.type})`);
        try {
            const result = await analyzeDirectly(test.url);

            const status = result.isHiring ? "HIRING" : "NOT HIRING";
            const match = result.isHiring === test.expected;

            console.log(`  Result: ${status} (Score: ${result.score})`);
            console.log(`  Expected: ${test.expected ? "HIRING" : "NOT HIRING"}`);

            if (match) {
                console.log("  ✅ PASS");
                passed++;
            } else {
                console.log("  ❌ FAIL");
                console.log("  Reasoning:", result.reasons);
            }
        } catch (e: any) {
            console.log("  ⚠️ ERROR:", e.message);
        }
        console.log("-----------------------------------");
    }

    console.log(`\nTest Summary: ${passed}/${TEST_URLS.length} Passed`);
}

runTests();
