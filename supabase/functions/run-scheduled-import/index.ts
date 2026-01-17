import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_PAGES_PER_RUN = 10; // Import 10 pages = 2000 events per hour
const PAGE_SIZE = 200;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { schedulerId } = await req.json();

    if (!schedulerId) {
      return new Response(
        JSON.stringify({ error: 'Scheduler ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get scheduler config
    const { data: scheduler, error: schedulerError } = await supabase
      .from('auto_import_schedulers')
      .select('*')
      .eq('id', schedulerId)
      .single();

    if (schedulerError || !scheduler) {
      return new Response(
        JSON.stringify({ error: 'Scheduler not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Running scheduler:', scheduler.name);

    // Create log entry
    const { data: logEntry } = await supabase
      .from('auto_import_logs')
      .insert({
        scheduler_id: schedulerId,
        started_at: new Date().toISOString(),
        status: 'running',
      })
      .select('id')
      .single();

    const logId = logEntry?.id;

    try {
      // Get Ticketmaster API key
      const { data: apiKeyData } = await supabase
        .from('api_keys')
        .select('api_key')
        .eq('service', 'ticketmaster')
        .single();

      if (!apiKeyData) {
        throw new Error('Ticketmaster API key not found');
      }

      const TICKETMASTER_API_KEY = apiKeyData.api_key;
      const config = scheduler.config;

      // Get starting page from config (resume where we left off)
      const startPage = config.currentPage || 0;
      
      let totalFound = 0;
      let totalImported = 0;
      let totalSkipped = 0;
      let currentPage = startPage;
      let consecutiveDuplicatePages = config.consecutiveDuplicatePages || 0;
      const MAX_DUPLICATE_PAGES = 5;

      console.log(`Starting from page ${startPage}`);

      // Fetch multiple pages
      for (let pageOffset = 0; pageOffset < MAX_PAGES_PER_RUN; pageOffset++) {
        currentPage = startPage + pageOffset;

        // Build query
        const ticketmasterUrl = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
        ticketmasterUrl.searchParams.append('apikey', TICKETMASTER_API_KEY);
        ticketmasterUrl.searchParams.append('countryCode', config.countryCode || 'DE');
        ticketmasterUrl.searchParams.append('size', PAGE_SIZE.toString());
        ticketmasterUrl.searchParams.append('page', currentPage.toString());
        ticketmasterUrl.searchParams.append('sort', 'date,asc');

        if (config.city) {
          ticketmasterUrl.searchParams.append('city', config.city);
        }
        if (config.radius) {
          ticketmasterUrl.searchParams.append('radius', config.radius);
        }

        // Add time window if configured
        if (config.startDate) {
          ticketmasterUrl.searchParams.append('startDateTime', config.startDate);
        }
        if (config.endDate) {
          ticketmasterUrl.searchParams.append('endDateTime', config.endDate);
        }

        console.log(`Fetching page ${currentPage}...`);

        // Fetch events
        const response = await fetch(ticketmasterUrl.toString());
        const data = await response.json();

        if (!response.ok) {
          console.error('Ticketmaster API error:', data);
          break;
        }

        const events = data._embedded?.events || [];
        const totalElements = data.page?.totalElements || 0;
        const totalPages = data.page?.totalPages || 0;

        console.log(`Page ${currentPage}: ${events.length} events (${totalElements} total available)`);

        if (events.length === 0) {
          console.log('No more events, stopping');
          break;
        }

        totalFound += events.length;

        // Import events
        let pageImported = 0;
        let pageSkipped = 0;

        // Batch insert for performance
        const eventsToInsert = [];

        for (const event of events) {
          const venue = event._embedded?.venues?.[0];
          const startDate = event.dates?.start?.dateTime || event.dates?.start?.localDate;

          if (!startDate) {
            pageSkipped++;
            continue;
          }

          // Check if already exists
          const { data: existing } = await supabase
            .from('scraped_events')
            .select('id')
            .eq('external_id', event.id)
            .maybeSingle();

          if (existing) {
            pageSkipped++;
            continue;
          }

          eventsToInsert.push({
            source_id: schedulerId,
            external_id: event.id,
            title: event.name,
            description: event.info || event.pleaseNote || 'Event von Ticketmaster',
            location: venue?.name || venue?.city?.name || 'Deutschland',
            latitude: venue?.location?.latitude ? parseFloat(venue.location.latitude) : null,
            longitude: venue?.location?.longitude ? parseFloat(venue.location.longitude) : null,
            start_date: startDate,
            category: 'Sonstiges',
            image_url: event.images?.[0]?.url,
            external_url: event.url,
            ticket_url: event.url,
            status: 'pending',
            raw_data: event,
          });
        }

        // Batch insert
        if (eventsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('scraped_events')
            .insert(eventsToInsert);

          if (insertError) {
            console.error('Batch insert error:', insertError.message);
            pageSkipped += eventsToInsert.length;
          } else {
            pageImported = eventsToInsert.length;
          }
        }

        totalImported += pageImported;
        totalSkipped += pageSkipped;

        console.log(`Page ${currentPage} complete: ${pageImported} imported, ${pageSkipped} skipped`);

        // Track consecutive duplicate pages
        if (pageImported === 0 && pageSkipped === events.length) {
          consecutiveDuplicatePages++;
          console.log(`Consecutive duplicate pages: ${consecutiveDuplicatePages}`);

          if (consecutiveDuplicatePages >= MAX_DUPLICATE_PAGES) {
            console.log('Too many duplicate pages, stopping');
            break;
          }
        } else {
          consecutiveDuplicatePages = 0;
        }

        // Check if we reached the end
        if (currentPage >= totalPages - 1) {
          console.log('Reached last page');
          currentPage = 0; // Reset for next run
          break;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      // Update scheduler config with current progress
      await supabase
        .from('auto_import_schedulers')
        .update({
          config: {
            ...config,
            currentPage: currentPage + 1,
            consecutiveDuplicatePages,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', schedulerId);

      // Update log with success
      await supabase
        .from('auto_import_logs')
        .update({
          finished_at: new Date().toISOString(),
          status: 'success',
          events_found: totalFound,
          events_imported: totalImported,
          events_skipped: totalSkipped,
          details: {
            pagesProcessed: currentPage - startPage + 1,
            startPage,
            endPage: currentPage,
          },
        })
        .eq('id', logId);

      return new Response(
        JSON.stringify({
          success: true,
          scheduler: scheduler.name,
          found: totalFound,
          imported: totalImported,
          skipped: totalSkipped,
          pagesProcessed: currentPage - startPage + 1,
          nextPage: currentPage + 1,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Import error:', error);

      if (logId) {
        await supabase
          .from('auto_import_logs')
          .update({
            finished_at: new Date().toISOString(),
            status: 'failed',
            error_message: error.message,
          })
          .eq('id', logId);
      }

      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } catch (error) {
    console.error('Function error:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
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
