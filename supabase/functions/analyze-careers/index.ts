import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { analyzeCareerPage } from "./logic.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { url } = await req.json();

        if (!url) {
            throw new Error("URL is required");
        }

        console.log(`[Exclusion-First Protocol] Analyzing: ${url}`);

        // Fetch the page
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

        // Run analysis using new Exclusion-First logic
        const result = analyzeCareerPage(html);

        console.log(`[Result] is_hiring: ${result.is_hiring}, score: ${result.confidence_score}`);
        console.log(`[Reason] ${result.reason}`);

        // Map to legacy format for backward compatibility with frontend
        return new Response(JSON.stringify({
            isHiring: result.is_hiring,
            score: result.confidence_score,
            reasons: [result.reason],
            debug: {
                protocol: "Exclusion-First",
                version: "2.0"
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error(`[Error] ${error.message}`);
        return new Response(JSON.stringify({
            error: error.message,
            isHiring: false,
            score: -999,
            reasons: [`Fatal error: ${error.message}`]
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
