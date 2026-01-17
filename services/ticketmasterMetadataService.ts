import { supabase } from '@/lib/supabase';

interface CachedMetadata {
  id: string;
  name: string;
  data: any;
}

class TicketmasterMetadataService {
  private readonly API_KEY = process.env.EXPO_PUBLIC_TICKETMASTER_API_KEY;
  private readonly API_BASE_URL = 'https://app.ticketmaster.com/discovery/v2';
  private readonly CACHE_DURATION_DAYS = 30;

  async fetchAndCacheGenres(countryCode: string = 'DE'): Promise<CachedMetadata[]> {
    const cacheKey = `genres_${countryCode}`;

    const cached = await this.getFromCache('genre', cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(
        `${this.API_BASE_URL}/classifications/genres.json?countryCode=${countryCode}&apikey=${this.API_KEY}&size=100`
      );

      if (!response.ok) {
        console.error('Failed to fetch genres:', response.statusText);
        return [];
      }

      const data = await response.json();
      const genres = data._embedded?.genres || [];

      const formattedGenres = genres.map((genre: any) => ({
        id: genre.id,
        name: genre.name,
        data: genre,
      }));

      await this.saveToCache('genre', cacheKey, formattedGenres, countryCode);

      return formattedGenres;
    } catch (error) {
      console.error('Error fetching genres:', error);
      return [];
    }
  }

  async fetchAndCacheSegments(countryCode: string = 'DE'): Promise<CachedMetadata[]> {
    const cacheKey = `segments_${countryCode}`;

    const cached = await this.getFromCache('segment', cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(
        `${this.API_BASE_URL}/classifications/segments.json?countryCode=${countryCode}&apikey=${this.API_KEY}&size=100`
      );

      if (!response.ok) {
        console.error('Failed to fetch segments:', response.statusText);
        return [];
      }

      const data = await response.json();
      const segments = data._embedded?.segments || [];

      const formattedSegments = segments.map((segment: any) => ({
        id: segment.id,
        name: segment.name,
        data: segment,
      }));

      await this.saveToCache('segment', cacheKey, formattedSegments, countryCode);

      return formattedSegments;
    } catch (error) {
      console.error('Error fetching segments:', error);
      return [];
    }
  }

  async fetchAndCacheSubGenres(genreId: string): Promise<CachedMetadata[]> {
    const cacheKey = `subgenres_${genreId}`;

    const cached = await this.getFromCache('subgenre', cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(
        `${this.API_BASE_URL}/classifications/genres/${genreId}.json?apikey=${this.API_KEY}`
      );

      if (!response.ok) {
        console.error('Failed to fetch subgenres:', response.statusText);
        return [];
      }

      const data = await response.json();
      const subGenres = data._embedded?.subgenres || [];

      const formattedSubGenres = subGenres.map((subGenre: any) => ({
        id: subGenre.id,
        name: subGenre.name,
        data: subGenre,
      }));

      await this.saveToCache('subgenre', cacheKey, formattedSubGenres);

      return formattedSubGenres;
    } catch (error) {
      console.error('Error fetching subgenres:', error);
      return [];
    }
  }

  async fetchAndCacheDMAs(countryCode: string = 'DE'): Promise<CachedMetadata[]> {
    const cacheKey = `dmas_${countryCode}`;

    const cached = await this.getFromCache('dma', cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(
        `${this.API_BASE_URL}/venues.json?countryCode=${countryCode}&apikey=${this.API_KEY}&size=200`
      );

      if (!response.ok) {
        console.error('Failed to fetch venues for DMAs:', response.statusText);
        return [];
      }

      const data = await response.json();
      const venues = data._embedded?.venues || [];

      const dmaMap = new Map<string, any>();

      venues.forEach((venue: any) => {
        if (venue.dma && venue.dma.length > 0) {
          venue.dma.forEach((dma: any) => {
            if (dma.id && !dmaMap.has(dma.id)) {
              dmaMap.set(dma.id, {
                id: dma.id,
                name: dma.name || `DMA ${dma.id}`,
                data: dma,
              });
            }
          });
        }
      });

      const dmas = Array.from(dmaMap.values());

      await this.saveToCache('dma', cacheKey, dmas, countryCode);

      return dmas;
    } catch (error) {
      console.error('Error fetching DMAs:', error);
      return [];
    }
  }

  async fetchAndCacheTopVenues(countryCode: string = 'DE', limit: number = 50): Promise<CachedMetadata[]> {
    const cacheKey = `top_venues_${countryCode}_${limit}`;

    const cached = await this.getFromCache('venue', cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(
        `${this.API_BASE_URL}/venues.json?countryCode=${countryCode}&apikey=${this.API_KEY}&size=${limit}&sort=name,asc`
      );

      if (!response.ok) {
        console.error('Failed to fetch venues:', response.statusText);
        return [];
      }

      const data = await response.json();
      const venues = data._embedded?.venues || [];

      const formattedVenues = venues.map((venue: any) => ({
        id: venue.id,
        name: venue.name,
        data: venue,
      }));

      await this.saveToCache('venue', cacheKey, formattedVenues, countryCode);

      return formattedVenues;
    } catch (error) {
      console.error('Error fetching venues:', error);
      return [];
    }
  }

  private async getFromCache(type: string, key: string): Promise<any[] | null> {
    try {
      const { data, error } = await supabase
        .from('ticketmaster_metadata_cache')
        .select('data')
        .eq('cache_type', type)
        .eq('cache_key', key)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return data.data;
    } catch (error) {
      console.error('Error getting from cache:', error);
      return null;
    }
  }

  private async saveToCache(
    type: string,
    key: string,
    data: any,
    countryCode?: string
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.CACHE_DURATION_DAYS);

      await supabase
        .from('ticketmaster_metadata_cache')
        .upsert({
          cache_type: type,
          cache_key: key,
          data,
          country_code: countryCode,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'cache_type,cache_key',
        });
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  async clearCache(): Promise<void> {
    try {
      await supabase
        .from('ticketmaster_metadata_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  async getAllCachedMetadata(type?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('ticketmaster_metadata_cache')
        .select('*')
        .gt('expires_at', new Date().toISOString());

      if (type) {
        query = query.eq('cache_type', type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting cached metadata:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllCachedMetadata:', error);
      return [];
    }
  }
}

export const ticketmasterMetadataService = new TicketmasterMetadataService();
