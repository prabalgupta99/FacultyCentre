import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { analyzeCareerPage } from './logic-node.js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function fetchHTMLWithRetry(url: string, retries = 3): Promise<string | null> {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                },
                signal: AbortSignal.timeout(10000)
            });

            if (response.ok) {
                return await response.text();
            }
        } catch (error: any) { }

        if (i < retries - 1) {
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    return null;
}

async function main() {
    console.log("Fetching all colleges from Supabase...");
    const { data: colleges, error } = await supabase.from('colleges').select('*');
    if (error) {
        console.error("Failed to fetch colleges:", error);
        return;
    }

    console.log(`Found ${colleges?.length || 0} colleges. Starting V4 Logic DB Sync...`);

    let updatedCount = 0;
    for (const college of colleges || []) {
        const url = college.career_page_url || college.college_website_url;
        if (!url) continue;

        console.log(`Analyzing [${college.id}] ${url}...`);
        const html = await fetchHTMLWithRetry(url);

        let isHiring = false;
        let score = 0;
        let reason = "Fetch failed";

        if (html) {
            const result = analyzeCareerPage(html);
            score = result.confidence_score;
            isHiring = score >= 40; // V4 threshold
            reason = result.reason;
        }

        const today = new Date().toISOString().split('T')[0];
        const newHistoryEntry = {
            date: today,
            score: score,
            type: 'cron',
            version: 'logic-v4'
        };

        let history = college.score_history || [];
        if (!Array.isArray(history)) history = [];

        history = history.filter((h: any) => !(h.date === today && h.type === 'cron'));
        history.push(newHistoryEntry);

        const { error: updateError } = await supabase
            .from('colleges')
            .update({
                is_hiring: isHiring,
                score_history: history,
                last_checked: new Date().toISOString()
            })
            .eq('id', college.id);

        if (updateError) {
            console.error(`❌ Failed to update ${college.id}:`, updateError.message);
        } else {
            console.log(`✅ Updated ${college.id} -> is_hiring: ${isHiring}, score: ${score}`);
            updatedCount++;
        }

        await new Promise(r => setTimeout(r, 500));
    }

    console.log(`Finished! Successfully updated ${updatedCount} colleges in the database.`);
}

main();
