import { supabase } from '../lib/supabase';
import type { TicketmasterQuery } from './ticketmasterQueryGenerator';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/fetch-ticketmaster-events`;

interface EventData {
  id: string;
  name: string;
  url: string;
  info?: string;
  pleaseNote?: string;
  dates?: {
    start?: {
      dateTime?: string;
      localDate?: string;
    };
  };
  classifications?: Array<{
    segment?: { name?: string };
    genre?: { name?: string };
  }>;
  images?: Array<{
    url: string;
    ratio?: string;
    width?: number;
  }>;
  _embedded?: {
    venues?: Array<{
      name?: string;
      city?: { name?: string };
      country?: { name?: string };
      location?: {
        latitude?: string;
        longitude?: string;
      };
    }>;
  };
}

interface QueryResult {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'error';
  eventsFound: number;
  eventsImported: number;
  eventsSkipped: number;
  errors: number;
  duration: number;
  hitLimit: boolean;
  pages: number;
}

export interface ImportProgressCallback {
  (data: {
    currentQuery: number;
    totalQueries: number;
    currentPage?: number;
    totalPages?: number;
    totalEventsImported: number;
    totalEventsSkipped: number;
    totalErrors: number;
    elapsedTime: number;
    queries: QueryResult[];
    categoryBreakdown?: Record<string, number>;
  }): void;
}

function mapCategory(segment?: string, genre?: string): string {
  const seg = segment?.toLowerCase();
  const gen = genre?.toLowerCase();

  if (seg?.includes('music') || gen?.includes('music')) return 'music';
  if (seg?.includes('sports') || gen?.includes('sport')) return 'sports';
  if (seg?.includes('arts') || seg?.includes('theatre')) return 'art';
  if (gen?.includes('comedy')) return 'nightlife';
  return 'other';
}

async function fetchTicketmasterPage(
  query: TicketmasterQuery,
  page: number,
  size: number = 200
): Promise<{ events: EventData[]; totalPages: number }> {
  const url = new URL(EDGE_FUNCTION_URL);
  url.searchParams.append('countryCode', query.countryCode);
  url.searchParams.append('size', size.toString());
  url.searchParams.append('page', page.toString());
  url.searchParams.append('sort', 'date,asc');
  url.searchParams.append('startDateTime', `${query.timeStart}T00:00:00Z`);
  url.searchParams.append('endDateTime', `${query.timeEnd}T23:59:59Z`);

  if (query.segment) {
    url.searchParams.append('classificationName', query.segment);
  }

  if (query.city) {
    url.searchParams.append('city', query.city);
  }

  console.log(`Fetching: ${query.label}, Page ${page + 1}`);
  console.log(`URL: ${url.toString()}`);

  const response = await fetch(url.toString());

  console.log(`Response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error: ${response.status} - ${errorText}`);
    throw new Error(`API returned ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const events = data._embedded?.events || [];
  const totalPages = data.page?.totalPages || 1;

  console.log(`Fetched ${events.length} events, total pages: ${totalPages}`);

  return { events, totalPages };
}

// Batch import mit einem SELECT für alle IDs
async function batchImportEvents(events: EventData[]): Promise<{
  imported: number;
  skipped: number;
  errors: number;
  categoryBreakdown: Record<string, number>;
}> {
  if (events.length === 0) {
    return { imported: 0, skipped: 0, errors: 0, categoryBreakdown: {} };
  }

  const categoryBreakdown: Record<string, number> = {};

  try {
    // 1. Hole alle external_ids die wir prüfen wollen
    const eventIds = events.map(e => e.id);

    console.log(`Batch checking ${eventIds.length} events for duplicates...`);

    // 2. Ein SELECT für ALLE IDs (viel schneller!)
    const { data: existingEvents, error: selectError } = await supabase
      .from('events')
      .select('external_id')
      .eq('external_source', 'ticketmaster')
      .in('external_id', eventIds);

    if (selectError) {
      console.error('Batch select error:', selectError);
      return { imported: 0, skipped: 0, errors: events.length, categoryBreakdown };
    }

    // 3. Set für schnellen Lookup
    const existingIds = new Set(existingEvents?.map(e => e.external_id) || []);
    console.log(`Found ${existingIds.size} existing events`);

    // 4. Filter neue Events
    const newEvents = events.filter(e => !existingIds.has(e.id));
    console.log(`${newEvents.length} new events to import`);

    if (newEvents.length === 0) {
      return { imported: 0, skipped: events.length, errors: 0, categoryBreakdown };
    }

    // 5. Prepare batch insert data
    const eventsToInsert = newEvents.map(event => {
      const venue = event._embedded?.venues?.[0];
      const location = venue?.name || '';
      const city = venue?.city?.name || '';
      const country = venue?.country?.name || '';
      const fullLocation = [location, city, country].filter(Boolean).join(', ');

      const latitude = venue?.location?.latitude ? parseFloat(venue.location.latitude) : null;
      const longitude = venue?.location?.longitude ? parseFloat(venue.location.longitude) : null;

      const startDateTime = event.dates?.start?.dateTime || event.dates?.start?.localDate;
      if (!startDateTime) return null;

      const startDate = startDateTime.split('T')[0];
      const startTime = startDateTime.includes('T')
        ? startDateTime.split('T')[1].substring(0, 5)
        : '20:00';

      const segment = event.classifications?.[0]?.segment?.name;
      const genre = event.classifications?.[0]?.genre?.name;
      const category = mapCategory(segment, genre);

      const images = event.images || [];
      const image =
        images.find((img) => img.ratio === '16_9' && img.width && img.width > 1000) ||
        images.find((img) => img.width && img.width > 800) ||
        images[0];

      const description = event.info || event.pleaseNote || `${event.name} from Ticketmaster`;

      // Track category
      const categoryLabel = segment || genre || 'Other';
      categoryBreakdown[categoryLabel] = (categoryBreakdown[categoryLabel] || 0) + 1;

      return {
        user_id: SYSTEM_USER_ID,
        title: event.name,
        description,
        category,
        location: fullLocation,
        latitude,
        longitude,
        start_date: startDate,
        start_time: startTime,
        end_date: null,
        end_time: null,
        image_url: image?.url || null,
        preview_image_url: image?.url || null,
        is_published: true,
        is_free: false,
        ticket_url: event.url,
        external_url: event.url,
        external_id: event.id,
        external_source: 'ticketmaster',
      };
    }).filter(Boolean);

    if (eventsToInsert.length === 0) {
      return { imported: 0, skipped: events.length, errors: 0, categoryBreakdown };
    }

    console.log(`Batch inserting ${eventsToInsert.length} events...`);

    // 6. BATCH INSERT!
    const { error: insertError } = await supabase
      .from('events')
      .insert(eventsToInsert);

    if (insertError) {
      console.error('Batch insert error:', insertError);
      // Bei Fehler, versuche einzeln (fallback)
      return { imported: 0, skipped: 0, errors: eventsToInsert.length, categoryBreakdown };
    }

    console.log(`Successfully imported ${eventsToInsert.length} events in batch!`);

    return {
      imported: eventsToInsert.length,
      skipped: events.length - newEvents.length,
      errors: newEvents.length - eventsToInsert.length,
      categoryBreakdown,
    };
  } catch (error) {
    console.error('Batch import error:', error);
    return { imported: 0, skipped: 0, errors: events.length, categoryBreakdown };
  }
}

async function importEvent(event: EventData): Promise<'imported' | 'skipped' | 'error'> {
  try {
    console.log(`Checking if event ${event.id} already exists...`);
    const { data: existing, error: selectError } = await supabase
      .from('events')
      .select('id')
      .eq('external_id', event.id)
      .eq('external_source', 'ticketmaster')
      .maybeSingle();

    if (selectError) {
      console.error('Error checking existing event:', selectError);
      return 'error';
    }

    if (existing) {
      console.log(`Event ${event.id} already exists, skipping`);
      return 'skipped';
    }

    console.log(`Event ${event.id} is new, preparing to import...`);

    const venue = event._embedded?.venues?.[0];
    const location = venue?.name || '';
    const city = venue?.city?.name || '';
    const country = venue?.country?.name || '';
    const fullLocation = [location, city, country].filter(Boolean).join(', ');

    const latitude = venue?.location?.latitude ? parseFloat(venue.location.latitude) : null;
    const longitude = venue?.location?.longitude ? parseFloat(venue.location.longitude) : null;

    const startDateTime = event.dates?.start?.dateTime || event.dates?.start?.localDate;
    if (!startDateTime) {
      console.log(`Event ${event.id} has no start date, skipping`);
      return 'skipped';
    }

    const startDate = startDateTime.split('T')[0];
    const startTime = startDateTime.includes('T')
      ? startDateTime.split('T')[1].substring(0, 5)
      : '20:00';

    const segment = event.classifications?.[0]?.segment?.name;
    const genre = event.classifications?.[0]?.genre?.name;
    const category = mapCategory(segment, genre);

    const images = event.images || [];
    const image =
      images.find((img) => img.ratio === '16_9' && img.width && img.width > 1000) ||
      images.find((img) => img.width && img.width > 800) ||
      images[0];

    const description = event.info || event.pleaseNote || `${event.name} from Ticketmaster`;

    console.log(`Inserting event ${event.id}: "${event.name}" into database...`);
    const { error } = await supabase.from('events').insert({
      user_id: SYSTEM_USER_ID,
      title: event.name,
      description,
      category,
      location: fullLocation,
      latitude,
      longitude,
      start_date: startDate,
      start_time: startTime,
      end_date: null,
      end_time: null,
      image_url: image?.url || null,
      preview_image_url: image?.url || null,
      is_published: true,
      is_free: false,
      ticket_url: event.url,
      external_url: event.url,
      external_id: event.id,
      external_source: 'ticketmaster',
    });

    if (error) {
      console.error(`Error inserting event ${event.id}:`, error);
      if (error.code === '23505') {
        console.log('Duplicate entry, skipping');
        return 'skipped';
      }
      return 'error';
    }

    console.log(`Successfully imported event ${event.id}`);
    return 'imported';
  } catch (error) {
    console.error('Error importing event:', error);
    return 'error';
  }
}

export async function executeMultiQueryImport(
  queries: TicketmasterQuery[],
  config: {
    mode: string;
    smartSplit: boolean;
  },
  onProgress?: ImportProgressCallback
): Promise<{
  totalEventsImported: number;
  totalEventsSkipped: number;
  totalErrors: number;
  totalEventsFound: number;
  queryResults: QueryResult[];
  categoryBreakdown: Record<string, number>;
}> {
  const startTime = Date.now();
  const queryResults: QueryResult[] = queries.map((q) => ({
    id: q.id,
    label: q.label,
    status: 'pending' as const,
    eventsFound: 0,
    eventsImported: 0,
    eventsSkipped: 0,
    errors: 0,
    duration: 0,
    hitLimit: false,
    pages: 0,
  }));

  let totalEventsImported = 0;
  let totalEventsSkipped = 0;
  let totalErrors = 0;
  let totalEventsFound = 0;
  const categoryBreakdown: Record<string, number> = {};

  console.log(`Starting import with ${queries.length} queries`);

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    const queryStartTime = Date.now();
    queryResults[i].status = 'running';

    console.log(`\n=== Query ${i + 1}/${queries.length}: ${query.label} ===`);

    try {
      let page = 0;
      const maxPages = 5;
      let eventsInQuery = 0;

      while (page < maxPages) {
        console.log(`Processing page ${page + 1}/${maxPages}`);

        if (onProgress) {
          onProgress({
            currentQuery: i + 1,
            totalQueries: queries.length,
            currentPage: page + 1,
            totalPages: maxPages,
            totalEventsImported,
            totalEventsSkipped,
            totalErrors,
            elapsedTime: Math.floor((Date.now() - startTime) / 1000),
            queries: queryResults,
            categoryBreakdown,
          });
        }

        console.log('Calling fetchTicketmasterPage...');
        const { events, totalPages } = await fetchTicketmasterPage(query, page);
        console.log(`Got ${events.length} events from page`);

        if (events.length === 0) break;

        eventsInQuery += events.length;
        totalEventsFound += events.length;

        // BATCH IMPORT - viel schneller!
        console.log(`Batch importing ${events.length} events...`);
        const batchResult = await batchImportEvents(events);

        totalEventsImported += batchResult.imported;
        totalEventsSkipped += batchResult.skipped;
        totalErrors += batchResult.errors;

        queryResults[i].eventsImported += batchResult.imported;
        queryResults[i].eventsSkipped += batchResult.skipped;
        queryResults[i].errors += batchResult.errors;

        // Merge category breakdown
        for (const [cat, count] of Object.entries(batchResult.categoryBreakdown)) {
          categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + count;
        }

        console.log(`Batch result: ${batchResult.imported} imported, ${batchResult.skipped} skipped, ${batchResult.errors} errors`);

        page++;
        queryResults[i].pages = page;

        if (page >= totalPages) break;

        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      queryResults[i].eventsFound = eventsInQuery;
      queryResults[i].status = 'success';
      queryResults[i].hitLimit = eventsInQuery >= 1000;
      queryResults[i].duration = Math.floor((Date.now() - queryStartTime) / 1000);
    } catch (error) {
      console.error(`Query ${i + 1} failed:`, error);
      queryResults[i].status = 'error';
      queryResults[i].duration = Math.floor((Date.now() - queryStartTime) / 1000);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return {
    totalEventsImported,
    totalEventsSkipped,
    totalErrors,
    totalEventsFound,
    queryResults,
    categoryBreakdown,
  };
}
