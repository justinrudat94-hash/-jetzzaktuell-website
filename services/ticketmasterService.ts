import { supabase } from '@/lib/supabase';

export interface TicketmasterEvent {
  id: string;
  name: string;
  url: string;
  images: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  dates: {
    start: {
      localDate: string;
      localTime?: string;
      dateTime?: string;
    };
    end?: {
      localDate?: string;
      localTime?: string;
    };
  };
  classifications?: Array<{
    segment?: { name: string };
    genre?: { name: string };
    subGenre?: { name: string };
  }>;
  priceRanges?: Array<{
    min: number;
    max: number;
    currency: string;
  }>;
  _embedded?: {
    venues?: Array<{
      name: string;
      city?: { name: string };
      country?: { name: string; countryCode: string };
      location?: {
        latitude: string;
        longitude: string;
      };
      address?: {
        line1?: string;
      };
    }>;
  };
  info?: string;
  pleaseNote?: string;
}

export interface TicketmasterSearchParams {
  countryCode?: string;
  city?: string;
  latlong?: string;
  radius?: string;
  startDateTime?: string;
  endDateTime?: string;
  classificationName?: string;
  genreName?: string;
  subGenreName?: string;
  size?: number;
  page?: number;
}

export interface TicketmasterSearchResult {
  events: TicketmasterEvent[];
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

class TicketmasterService {
  private readonly API_BASE_URL = 'https://app.ticketmaster.com/discovery/v2';
  private readonly AFFILIATE_PARTNER_ID = 'TICKETMASTER_PARTNER_ID_PLACEHOLDER';

  async searchEvents(params: TicketmasterSearchParams): Promise<TicketmasterSearchResult> {
    try {
      const queryParams = new URLSearchParams();

      if (params.countryCode) queryParams.append('countryCode', params.countryCode);
      if (params.city) queryParams.append('city', params.city);
      if (params.latlong) queryParams.append('latlong', params.latlong);
      if (params.radius) queryParams.append('radius', params.radius);
      if (params.startDateTime) queryParams.append('startDateTime', params.startDateTime);
      if (params.endDateTime) queryParams.append('endDateTime', params.endDateTime);
      if (params.classificationName) queryParams.append('classificationName', params.classificationName);
      if (params.genreName) queryParams.append('genreName', params.genreName);
      if (params.subGenreName) queryParams.append('subGenreName', params.subGenreName);

      queryParams.append('size', (params.size || 20).toString());
      queryParams.append('page', (params.page || 0).toString());
      queryParams.append('sort', 'date,asc');

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/fetch-ticketmaster-events?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ticketmaster API error: ${errorText}`);
      }

      const data = await response.json();

      return {
        events: data._embedded?.events || [],
        page: data.page || { size: 0, totalElements: 0, totalPages: 0, number: 0 },
      };
    } catch (error) {
      console.error('Error searching Ticketmaster events:', error);
      throw error;
    }
  }

  generateAffiliateUrl(eventUrl: string): string {
    if (!eventUrl) return '';

    try {
      const url = new URL(eventUrl);
      url.searchParams.set('tm_link', this.AFFILIATE_PARTNER_ID);
      return url.toString();
    } catch (error) {
      console.error('Error generating affiliate URL:', error);
      return eventUrl;
    }
  }

  async importEventToScraped(event: TicketmasterEvent, sourceId: string): Promise<boolean> {
    try {
      const venue = event._embedded?.venues?.[0];
      const venueName = venue?.name || '';
      const address = venue?.address?.line1 || '';
      const cityName = venue?.city?.name || '';
      const countryName = venue?.country?.name || 'Deutschland';

      const location = [venueName, address, cityName].filter(Boolean).join(', ') || countryName;

      const latitude = venue?.location?.latitude
        ? parseFloat(venue.location.latitude)
        : null;
      const longitude = venue?.location?.longitude
        ? parseFloat(venue.location.longitude)
        : null;

      console.log(`Event details - Location: ${location}, Coords: ${latitude}, ${longitude}`);

      let startDate = event.dates.start.dateTime;
      if (!startDate && event.dates.start.localDate) {
        const time = event.dates.start.localTime || '20:00:00';
        startDate = `${event.dates.start.localDate}T${time}`;
      }

      const endDate = event.dates.end?.localDate
        ? `${event.dates.end.localDate}T${event.dates.end.localTime || '23:00:00'}`
        : null;

      const category = this.mapCategory(event.classifications?.[0]);

      const image = event.images?.find(img => img.width >= 640)?.url || event.images?.[0]?.url;

      const description = [
        event.info,
        event.pleaseNote,
        event.priceRanges?.length
          ? `Preis: ${event.priceRanges[0].min}-${event.priceRanges[0].max} ${event.priceRanges[0].currency}`
          : null
      ].filter(Boolean).join('\n\n') || 'Event von Ticketmaster';

      const affiliateUrl = this.generateAffiliateUrl(event.url);

      const { data, error } = await supabase
        .from('scraped_events')
        .insert({
          source_id: sourceId,
          external_id: event.id,
          title: event.name,
          description,
          location,
          latitude,
          longitude,
          start_date: startDate,
          end_date: endDate,
          category,
          image_url: image,
          external_url: event.url,
          ticket_url: affiliateUrl,
          status: 'pending',
          raw_data: event,
        })
        .select()
        .maybeSingle();

      if (error) {
        if (error.code === '23505') {
          console.log('Event already exists:', event.name);
          return false;
        }
        console.error('Database error inserting event:', error);
        throw error;
      }

      console.log(`Inserted into scraped_events with ID: ${data?.id}`);
      return true;
    } catch (error) {
      console.error('Error importing Ticketmaster event:', error);
      return false;
    }
  }

  async bulkImportEvents(
    events: TicketmasterEvent[],
    sourceId: string
  ): Promise<{ success: number; failed: number; skipped: number }> {
    const result = { success: 0, failed: 0, skipped: 0 };

    console.log(`Starting bulk import of ${events.length} events to source ${sourceId}`);

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      try {
        console.log(`[${i + 1}/${events.length}] Importing: ${event.name}`);
        const imported = await this.importEventToScraped(event, sourceId);
        if (imported) {
          result.success++;
          console.log(`✅ Successfully imported: ${event.name}`);
        } else {
          result.skipped++;
          console.log(`⏭️ Skipped (already exists): ${event.name}`);
        }
      } catch (error) {
        result.failed++;
        console.error(`❌ Failed to import event ${event.name}:`, error);
      }
    }

    console.log('Bulk import completed:', result);
    return result;
  }

  private mapCategory(classification?: TicketmasterEvent['classifications'][0]): string {
    if (!classification) return 'Sonstiges';

    const segment = classification.segment?.name?.toLowerCase() || '';
    const genre = classification.genre?.name?.toLowerCase() || '';

    if (segment.includes('music') || genre.includes('music')) return 'Musik';
    if (segment.includes('sports') || genre.includes('sport')) return 'Sport';
    if (segment.includes('arts') || segment.includes('theatre')) return 'Kunst';
    if (genre.includes('theatre') || genre.includes('musical')) return 'Theater';
    if (genre.includes('comedy')) return 'Comedy';
    if (segment.includes('film')) return 'Film';
    if (genre.includes('family')) return 'Familie';

    return 'Sonstiges';
  }

  async createTicketmasterSource(
    name: string,
    searchParams: TicketmasterSearchParams
  ): Promise<string> {
    try {
      console.log('Creating Ticketmaster source:', name, searchParams);

      const { data, error } = await supabase
        .from('event_sources')
        .insert({
          name,
          source_type: 'ticketmaster',
          url: 'https://www.ticketmaster.de',
          is_active: true,
          config: searchParams,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating source:', error);
        throw error;
      }

      console.log('Source created successfully with ID:', data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating Ticketmaster source:', error);
      throw error;
    }
  }

  async importToEvents(scrapedEvent: any): Promise<string | null> {
    try {
      const venue = scrapedEvent.raw_data?._embedded?.venues?.[0];
      const venueName = venue?.name || '';
      const cityName = venue?.city?.name || scrapedEvent.location || 'Deutschland';
      const address = venue?.address?.line1 || '';

      const locationName = venueName || address || cityName;

      const fullLocation = [venueName, address].filter(Boolean).join(', ');

      const startDateTime = new Date(scrapedEvent.start_date);
      const startDate = startDateTime.toISOString().split('T')[0];
      const startTime = startDateTime.toTimeString().split(' ')[0].substring(0, 5);

      let endDate = null;
      let endTime = null;
      if (scrapedEvent.end_date) {
        const endDateTime = new Date(scrapedEvent.end_date);
        endDate = endDateTime.toISOString().split('T')[0];
        endTime = endDateTime.toTimeString().split(' ')[0].substring(0, 5);
      }

      const priceRanges = scrapedEvent.raw_data?.priceRanges;
      let price = null;
      let isFree = false;

      if (priceRanges && priceRanges.length > 0) {
        const minPrice = priceRanges[0].min;
        const maxPrice = priceRanges[0].max;

        if (minPrice === 0 && maxPrice === 0) {
          isFree = true;
          price = 0;
        } else {
          isFree = false;
          price = minPrice;
        }
      } else {
        isFree = false;
        price = null;
      }

      let image = scrapedEvent.image_url;
      if (!image && scrapedEvent.raw_data?.images?.length) {
        const bestImage = scrapedEvent.raw_data.images.find((img: any) => img.width >= 640) ||
                         scrapedEvent.raw_data.images[0];
        image = bestImage?.url;
      }

      const { data, error } = await supabase
        .from('events')
        .insert({
          user_id: null,
          title: scrapedEvent.title,
          description: scrapedEvent.description,
          category: scrapedEvent.category,
          start_date: startDate,
          start_time: startTime,
          end_date: endDate,
          end_time: endTime,
          location: fullLocation || locationName,
          city: cityName,
          latitude: scrapedEvent.latitude,
          longitude: scrapedEvent.longitude,
          preview_image_url: image,
          ticket_url: scrapedEvent.ticket_url,
          price,
          is_free: isFree,
          external_source: 'ticketmaster',
          external_event_id: scrapedEvent.external_id,
          is_auto_imported: true,
          is_published: true,
        })
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') {
          console.log('Event already exists in events table:', scrapedEvent.title);
          return null;
        }
        throw error;
      }

      await supabase
        .from('scraped_events')
        .update({
          event_id: data.id,
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', scrapedEvent.id);

      return data.id;
    } catch (error) {
      console.error('Error importing to events:', error);
      return null;
    }
  }

  async checkAlreadyImported(externalIds: string[]): Promise<Set<string>> {
    try {
      if (externalIds.length === 0) return new Set();

      const { data, error } = await supabase
        .from('scraped_events')
        .select('external_id')
        .in('external_id', externalIds);

      if (error) {
        console.error('Error checking imports:', error);
        return new Set();
      }

      return new Set(data?.map(e => e.external_id) || []);
    } catch (error) {
      console.error('Error in checkAlreadyImported:', error);
      return new Set();
    }
  }

  async autoImportApprovedEvents(): Promise<{ imported: number; failed: number }> {
    try {
      const { data: scrapedEvents, error } = await supabase
        .from('scraped_events')
        .select('*')
        .eq('status', 'pending')
        .eq('source_id', 'ticketmaster')
        .is('event_id', null);

      if (error) throw error;
      if (!scrapedEvents || scrapedEvents.length === 0) {
        return { imported: 0, failed: 0 };
      }

      let imported = 0;
      let failed = 0;

      for (const scrapedEvent of scrapedEvents) {
        const eventId = await this.importToEvents(scrapedEvent);
        if (eventId) {
          imported++;
        } else {
          failed++;
        }
      }

      return { imported, failed };
    } catch (error) {
      console.error('Error in auto-import:', error);
      return { imported: 0, failed: 0 };
    }
  }

  async getOrCreateDefaultSource(): Promise<string> {
    // Always use the same source - get the oldest active Ticketmaster source
    const { data: existingSources } = await supabase
      .from('event_sources')
      .select('id, name')
      .eq('source_type', 'ticketmaster')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingSources) {
      console.log('Using existing Ticketmaster source:', existingSources.name);
      return existingSources.id;
    }

    // Only create a new source if none exists
    console.log('Creating new default Ticketmaster source');
    const { data: newSource, error } = await supabase
      .from('event_sources')
      .insert({
        name: 'Ticketmaster Deutschland Auto-Import',
        source_type: 'ticketmaster',
        url: 'https://www.ticketmaster.de',
        is_active: true,
        config: { countryCode: 'DE' },
      })
      .select('id')
      .single();

    if (error) {
      // If insert fails (e.g., race condition), try to get existing again
      const { data: retrySource } = await supabase
        .from('event_sources')
        .select('id')
        .eq('source_type', 'ticketmaster')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (retrySource) {
        return retrySource.id;
      }

      throw error;
    }

    return newSource.id;
  }

  async saveToScrapedEvents(event: TicketmasterEvent): Promise<boolean> {
    try {
      const sourceId = await this.getOrCreateDefaultSource();
      return await this.importEventToScraped(event, sourceId);
    } catch (error) {
      console.error('Error saving to scraped events:', error);
      return false;
    }
  }
}

export const ticketmasterService = new TicketmasterService();
