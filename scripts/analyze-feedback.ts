
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from 'dotenv';
config();

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeFeedback() {
    console.log("--- Fetching Manual Feedback ---");

    // 1. Fetch all colleges with score_history
    const { data: colleges, error } = await supabase
        .from('colleges')
        .select('id, college_name_place, score_history');

    if (error) {
        console.error("Error fetching colleges:", error);
        return;
    }

    let feedbackCount = 0;
    let discrepancies = 0;

    console.log(`Scanning ${colleges.length} colleges for feedback...n`);

    for (const college of colleges) {
        const history = college.score_history;
        if (!Array.isArray(history) || history.length === 0) continue;

        // Find manual entries with feedback
        const manualEntries = history.filter((h: any) => h.type === 'manual' && h.feedback);

        if (manualEntries.length > 0) {
            console.log(`\n🏫 ${college.college_name_place} (ID: ${college.id})`);
            feedbackCount += manualEntries.length;

            manualEntries.forEach((entry: any) => {
                const isValid = entry.feedback.isValid;
                const icon = isValid ? '✅' : '❌';
                const comment = entry.feedback.comment || "No comment";
                const date = entry.date;
                const score = entry.score;

                console.log(`   ${icon} [${date}] Score: ${score} - User Status: ${isValid ? 'Valid' : 'Invalid'}`);
                console.log(`      Comment: "${comment}"`);
                if (entry.feedback.screenshot) {
                    console.log(`      📸 Screenshot attached`);
                }

                if (!isValid) discrepancies++;
            });
        }
    }

    console.log("\n--- Summary ---");
    console.log(`Total Feedback Entries: ${feedbackCount}`);
    console.log(`Flagged as Incorrect: ${discrepancies}`);
    console.log("----------------");
}

analyzeFeedback();
