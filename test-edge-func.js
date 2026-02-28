import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEdgeFunction() {
    const testUrl = 'https://cnlawcollege.ac.in/career.html'; // Chotanagpur Law College

    console.log(`Testing analyze-careers Edge Function for URL: ${testUrl}`);
    try {
        const { data, error } = await supabase.functions.invoke('analyze-careers', {
            body: { url: testUrl }
        });

        if (error) {
            console.error('Edge Function Error Response:');
            console.dir(error, { depth: null });
            return;
        }

        console.log('Edge Function Success Response:');
        console.dir(data, { depth: null });

    } catch (err) {
        console.error('Fetch caught an exception:');
        console.dir(err, { depth: null });
    }
}

testEdgeFunction();
