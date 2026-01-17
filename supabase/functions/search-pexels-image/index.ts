import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('service', 'pexels')
      .single();

    if (apiKeyError || !apiKeyData) {
      console.error('Failed to fetch Pexels API key from database:', apiKeyError);
      return new Response(
        JSON.stringify({ error: 'Pexels API Key nicht gefunden' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const PEXELS_API_KEY = apiKeyData.api_key;
    const url = new URL(req.url);
    const query = url.searchParams.get('query') || 'event';
    const perPage = url.searchParams.get('per_page') || '1';

    console.log('Searching Pexels for:', query);

    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
      {
        headers: {
          'Authorization': PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pexels API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Pexels API Fehler', status: response.status }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    console.log(`Found ${data.photos?.length || 0} images from Pexels`);

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in search-pexels-image:', error);
    return new Response(
      JSON.stringify({ error: 'Interner Fehler', message: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
