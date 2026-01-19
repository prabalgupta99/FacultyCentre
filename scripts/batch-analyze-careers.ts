/**
 * Batch Career Analysis Script
 * 
 * Fetches all colleges from Supabase and analyzes their career pages
 * by calling the analyze-careers Edge Function.
 * 
 * This ensures we use the same Exclusion-First Protocol logic
 * that's deployed in the Edge Function.
 */

import { createClient } from '@supabase/supabase-js';
import pLimit from 'p-limit';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLE_NAME = 'colleges';
const CONCURRENCY_LIMIT = 10; // Conservative limit
const BATCH_SIZE = 50;

interface College {
    id: number;
    career_page_url: string;
}

interface AnalysisResult {
    id: number;
    is_hiring: boolean;
    confidence_score: number;
    analysis_reason: string;
    last_checked: string;
    error_log: string | null;
}

async function analyzeCollege(college: College): Promise<AnalysisResult> {
    if (!college.career_page_url) {
        return {
            id: college.id,
            is_hiring: false,
            confidence_score: -999,
            analysis_reason: 'No career URL provided',
            last_checked: new Date().toISOString(),
            error_log: 'No career URL'
        };
    }

    try {
        // Call the Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('analyze-careers', {
            body: { url: college.career_page_url }
        });

        if (error) {
            throw error;
        }

        return {
            id: college.id,
            is_hiring: data.isHiring || false,
            confidence_score: data.score || 0,
            analysis_reason: data.reasons?.[0] || 'Analysis completed',
            last_checked: new Date().toISOString(),
            error_log: null
        };

    } catch (err: any) {
        return {
            id: college.id,
            is_hiring: false,
            confidence_score: -999,
            analysis_reason: 'Error during analysis',
            last_checked: new Date().toISOString(),
            error_log: err.message?.substring(0, 200) || 'Unknown error'
        };
    }
}

async function main() {
    console.log('🚀 Starting Batch Career Analysis...\n');
    console.log('📡 Using Supabase Edge Function: analyze-careers\n');

    // Fetch ALL colleges with pagination
    console.log('📥 Fetching colleges from database...');
    let allColleges: College[] = [];
    const PAGE_SIZE = 1000;
    let page = 0;

    while (true) {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('id, career_page_url')
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) {
            console.error('❌ Error fetching data:', error.message);
            process.exit(1);
        }

        if (!data || data.length === 0) break;

        allColleges = allColleges.concat(data);

        if (data.length < PAGE_SIZE) break;
        page++;
    }

    console.log(`✅ Found ${allColleges.length} colleges to analyze\n`);

    if (allColleges.length === 0) {
        console.log('⚠️  No colleges to analyze');
        return;
    }

    // Process with concurrency control
    const limit = pLimit(CONCURRENCY_LIMIT);
    let processed = 0;
    let hiringCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allColleges.length; i += BATCH_SIZE) {
        const chunk = allColleges.slice(i, i + BATCH_SIZE);

        // Analyze all colleges in this chunk concurrently
        const chunkTasks = chunk.map(c => limit(() => analyzeCollege(c)));
        const results = await Promise.all(chunkTasks);

        // Update database in batch
        const { error: updateError } = await supabase
            .from(TABLE_NAME)
            .upsert(results.map(r => ({
                id: r.id,
                is_hiring: r.is_hiring,
                last_checked: r.last_checked,
                error_log: r.error_log
            })));

        if (updateError) {
            console.error('❌ Batch update error:', updateError.message);
            errorCount += chunk.length;
        } else {
            processed += chunk.length;
            hiringCount += results.filter(r => r.is_hiring).length;

            const progress = Math.min(i + BATCH_SIZE, allColleges.length);
            const percentage = Math.round((progress / allColleges.length) * 100);
            console.log(`✅ Progress: ${progress}/${allColleges.length} (${percentage}%) | Hiring: ${hiringCount}`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Batch Analysis Complete!');
    console.log('='.repeat(60));
    console.log(`📊 Total Processed: ${processed}`);
    console.log(`✅ Colleges Hiring: ${hiringCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(60) + '\n');
}

main().catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
});
