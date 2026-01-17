import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
      .eq('service', 'ticketmaster')
      .single();

    if (apiKeyError || !apiKeyData) {
      console.error('Failed to fetch Ticketmaster API key from database:', apiKeyError);
      return new Response(
        JSON.stringify({
          error: 'Ticketmaster API Key nicht gefunden',
          message: 'API-Key konnte nicht aus der Datenbank geladen werden',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const TICKETMASTER_API_KEY = apiKeyData.api_key;
    console.log('Ticketmaster API Key loaded from database, length:', TICKETMASTER_API_KEY.length);

    const url = new URL(req.url);
    const params = url.searchParams;

    const ticketmasterUrl = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
    ticketmasterUrl.searchParams.append('apikey', TICKETMASTER_API_KEY);

    if (params.get('countryCode')) {
      ticketmasterUrl.searchParams.append('countryCode', params.get('countryCode')!);
    }
    if (params.get('city')) {
      ticketmasterUrl.searchParams.append('city', params.get('city')!);
    }
    if (params.get('latlong')) {
      ticketmasterUrl.searchParams.append('latlong', params.get('latlong')!);
    }
    if (params.get('radius')) {
      ticketmasterUrl.searchParams.append('radius', params.get('radius')!);
    }
    if (params.get('startDateTime')) {
      ticketmasterUrl.searchParams.append('startDateTime', params.get('startDateTime')!);
    }
    if (params.get('endDateTime')) {
      ticketmasterUrl.searchParams.append('endDateTime', params.get('endDateTime')!);
    }
    if (params.get('classificationName')) {
      ticketmasterUrl.searchParams.append('segmentName', params.get('classificationName')!);
    }
    if (params.get('genreName')) {
      ticketmasterUrl.searchParams.append('genreName', params.get('genreName')!);
    }
    if (params.get('subGenreName')) {
      ticketmasterUrl.searchParams.append('subGenreName', params.get('subGenreName')!);
    }

    ticketmasterUrl.searchParams.append('size', params.get('size') || '20');
    ticketmasterUrl.searchParams.append('page', params.get('page') || '0');
    ticketmasterUrl.searchParams.append('sort', params.get('sort') || 'date,asc');

    const urlForLog = ticketmasterUrl.toString().replace(TICKETMASTER_API_KEY, 'HIDDEN');
    console.log('Fetching from Ticketmaster:', urlForLog);
    console.log('Segment:', params.get('classificationName'), 'Genre:', params.get('genreName'), 'SubGenre:', params.get('subGenreName'));

    const response = await fetch(ticketmasterUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ticketmaster API error:', response.status, errorText);

      return new Response(
        JSON.stringify({
          error: 'Ticketmaster API Fehler',
          status: response.status,
          message: errorText,
        }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const data = await response.json();

    console.log(`Successfully fetched ${data._embedded?.events?.length || 0} events from Ticketmaster`);

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in fetch-ticketmaster-events:', error);

    return new Response(
      JSON.stringify({
        error: 'Interner Fehler',
        message: error.message || 'Unbekannter Fehler',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});