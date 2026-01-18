import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { url } = await req.json()
        if (!url) {
            throw new Error('URL is required')
        }

        console.log(`Checking URL: ${url}`);

        // Fetch headers only (HEAD request)
        // We use a custom User-Agent to avoid being blocked by some simple bot filters, 
        // though sophisticated ones might still block.
        const response = await fetch(url, {
            method: 'HEAD',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; FacultyCentreBot/1.0; +http://facultycentre.app)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            }
        })

        const xFrameOptions = response.headers.get('x-frame-options')?.toUpperCase()
        const csp = response.headers.get('content-security-policy')?.toLowerCase()

        console.log(`X-Frame-Options: ${xFrameOptions}`);
        console.log(`CSP: ${csp}`);

        let embeddable = true

        // Check X-Frame-Options
        if (xFrameOptions === 'DENY' || xFrameOptions === 'SAMEORIGIN') {
            embeddable = false
        }

        // Check CSP frame-ancestors
        if (csp && csp.includes('frame-ancestors')) {
            // If frame-ancestors is present, it likely restricts embedding.
            // Unless it explicitly allows * (wildcard) or our domain (which we can't easily check dynamically here without passing it)
            // For general "open internet" embedding, if it restricts, we assume blocked.
            if (!csp.includes('frame-ancestors *')) {
                embeddable = false
            }
        }

        return new Response(
            JSON.stringify({ embeddable, xFrameOptions, csp }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error(`Error checking URL: ${error.message}`);
        // If we can't reach the site (e.g. timeout, DNS error), we probably can't embed it either, 
        // OR it might be a temporary glitch. 
        // Safest bet for "Refused to connect" UX is to assume it might work or let the client fallback if it fails.
        // However, if fetch fails server-side, it might also fail client-side if it's down.
        // Let's return embeddable: false so we fallback to the "Open in new tab" view which is safer.
        return new Response(
            JSON.stringify({ error: error.message, embeddable: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    }
})
