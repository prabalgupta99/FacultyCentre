import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const googleSheetUrl = process.env.GOOGLE_SHEET_CSV_URL!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface CollegeRow {
    state?: string;
    affiliating_university?: string;
    college_name_place: string;
    college_website_url?: string;
    career_page_url?: string;
    latitude?: number;
    longitude?: number;
    type?: string;
}

async function syncGoogleSheetToSupabase() {
    console.log('🔄 Starting Google Sheets sync...');

    try {
        // Fetch CSV from Google Sheets
        console.log('📥 Fetching data from Google Sheets...');
        const response = await fetch(googleSheetUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch Google Sheet: ${response.statusText}`);
        }

        const csvText = await response.text();

        // Parse CSV
        const records = parse(csvText, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        console.log(`📊 Found ${records.length} rows in Google Sheet`);

        // Transform and prepare data
        const colleges: CollegeRow[] = records.map((row: any) => ({
            state: row.State || row.state || null,
            affiliating_university: row['Affiliating University'] || row.affiliating_university || null,
            college_name_place: row['College Name & Place'] || row.college_name_place || row['College Name'],
            college_website_url: row['College Website URL'] || row.college_website_url || null,
            career_page_url: row['Career Page URL'] || row.career_page_url || null,
            latitude: row.Latitude || row.latitude ? parseFloat(row.Latitude || row.latitude) : null,
            longitude: row.Longitude || row.longitude ? parseFloat(row.Longitude || row.longitude) : null,
            type: row.Type || row.type || null,
        }));

        // Filter out rows without career page URL
        const validColleges = colleges.filter(c => c.career_page_url);
        console.log(`✅ ${validColleges.length} colleges have career page URLs`);

        if (validColleges.length === 0) {
            console.log('⚠️  No valid colleges to sync');
            return;
        }

        // Sync to Supabase using upsert (insert or update)
        console.log('💾 Syncing to Supabase...');

        // Process in batches of 100
        const BATCH_SIZE = 100;
        let synced = 0;

        for (let i = 0; i < validColleges.length; i += BATCH_SIZE) {
            const batch = validColleges.slice(i, i + BATCH_SIZE);

            const { error } = await supabase
                .from('colleges')
                .upsert(batch, {
                    onConflict: 'career_page_url', // Use career_page_url as unique key
                    ignoreDuplicates: false, // Update existing records
                });

            if (error) {
                console.error(`❌ Error syncing batch ${i / BATCH_SIZE + 1}:`, error);
            } else {
                synced += batch.length;
                console.log(`✅ Synced ${synced}/${validColleges.length} colleges`);
            }
        }

        console.log('🎉 Google Sheets sync complete!');
        console.log(`📊 Total synced: ${synced} colleges`);

    } catch (error) {
        console.error('❌ Sync failed:', error);
        process.exit(1);
    }
}

syncGoogleSheetToSupabase();
