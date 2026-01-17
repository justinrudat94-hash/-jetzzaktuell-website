import { supabase } from '../lib/supabase';
import { GERMAN_CITIES, City, getCitiesByPriority } from '../constants/GermanCities';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const RATE_LIMIT_DELAY = 250;

interface CityImportConfig {
  cities?: City[];
  priorities?: number[];
  maxCities?: number;
  categoryIds?: string[];
  startDate?: string;
  endDate?: string;
}

interface ImportProgress {
  cityName: string;
  cityIndex: number;
  totalCities: number;
  eventsFound: number;
  eventsImported: number;
  eventsSkipped: number;
}

export class TicketmasterCityImportService {
  private importRunId: string | null = null;
  private onProgressUpdate?: (progress: ImportProgress) => void;

  async startImport(
    config: CityImportConfig,
    onProgress?: (progress: ImportProgress) => void
  ): Promise<{ success: boolean; message: string; importRunId: string }> {
    console.log('[IMPORT] Import gestartet mit Config:', config);
    this.onProgressUpdate = onProgress;

    const cities = this.selectCities(config);
    console.log(`[IMPORT] ${cities.length} Städte ausgewählt:`, cities.map(c => c.name));

    if (cities.length === 0) {
      return { success: false, message: 'Keine Städte ausgewählt', importRunId: '' };
    }

    const { data: importRun, error } = await supabase
      .from('ticketmaster_import_history')
      .insert({
        mode: 'city_based',
        status: 'running',
        started_at: new Date().toISOString(),
        config: { cities: cities.map(c => c.name), ...config },
        total_found: 0,
        imported_count: 0,
        skipped_count: 0,
        error_count: 0,
      })
      .select()
      .single();

    if (error || !importRun) {
      console.error('[IMPORT] Import start error:', error);
      return { success: false, message: error?.message || 'Fehler beim Starten des Imports', importRunId: '' };
    }

    this.importRunId = importRun.id;
    console.log('[IMPORT] Import Run ID:', importRun.id);

    this.runImport(cities, config).catch(error => {
      console.error('[IMPORT] Import failed:', error);
      this.markImportFailed(error.message);
    });

    return {
      success: true,
      message: `Import gestartet für ${cities.length} Städte`,
      importRunId: importRun.id,
    };
  }

  private selectCities(config: CityImportConfig): City[] {
    if (config.cities && config.cities.length > 0) {
      return config.cities;
    }

    if (config.priorities && config.priorities.length > 0) {
      const cities: City[] = [];
      config.priorities.forEach(priority => {
        cities.push(...getCitiesByPriority(priority));
      });
      return cities;
    }

    if (config.maxCities) {
      return GERMAN_CITIES.slice(0, config.maxCities);
    }

    return GERMAN_CITIES.slice(0, 10);
  }

  private async runImport(cities: City[], config: CityImportConfig) {
    let totalFound = 0;
    let totalImported = 0;
    let totalSkipped = 0;

    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];

      try {
        const events = await this.fetchEventsForCity(city, config);

        for (const event of events) {
          const result = await this.importEvent(event, city.name);
          if (result === 'imported') totalImported++;
          else if (result === 'skipped') totalSkipped++;
        }

        totalFound += events.length;

        if (this.onProgressUpdate) {
          this.onProgressUpdate({
            cityName: city.name,
            cityIndex: i + 1,
            totalCities: cities.length,
            eventsFound: totalFound,
            eventsImported: totalImported,
            eventsSkipped: totalSkipped,
          });
        }

        await this.updateImportHistory(totalFound, totalImported, totalSkipped);
        await this.delay(RATE_LIMIT_DELAY);
      } catch (error) {
        console.error(`Fehler bei Stadt ${city.name}:`, error);
      }
    }

    await this.markImportCompleted(totalFound, totalImported, totalSkipped);
  }

  private async fetchEventsForCity(
    city: City,
    config: CityImportConfig
  ): Promise<any[]> {
    console.log(`[IMPORT] Fetching events for ${city.name}...`);
    const params = new URLSearchParams({
      countryCode: 'DE',
      latlong: `${city.latitude},${city.longitude}`,
      radius: city.radius.toString(),
      size: '200',
      sort: 'date,asc',
    });

    if (config.startDate) {
      params.append('startDateTime', config.startDate);
    }

    if (config.endDate) {
      params.append('endDateTime', config.endDate);
    }

    const url = `${SUPABASE_URL}/functions/v1/fetch-ticketmaster-events?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[IMPORT] Edge Function Error:', errorData);
      throw new Error(`API Error: ${response.status} - ${errorData.error || 'Unknown'}`);
    }

    const data = await response.json();
    const events = data._embedded?.events || [];
    console.log(`[IMPORT] Found ${events.length} events for ${city.name}`);

    return events;
  }

  private async importEvent(event: any, cityName: string): Promise<'imported' | 'skipped'> {
    const externalEventId = `ticketmaster_${event.id}`;

    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('external_event_id', externalEventId)
      .maybeSingle();

    if (existing) {
      console.log(`[IMPORT]  Skipped: ${event.name} (already exists)`);
      return 'skipped';
    }

    const venue = event._embedded?.venues?.[0];
    const classification = event.classifications?.[0];

    const eventData = {
      title: event.name,
      description: event.info || event.pleaseNote || '',
      location: venue?.name || cityName,
      latitude: venue?.location?.latitude ? parseFloat(venue.location.latitude) : null,
      longitude: venue?.location?.longitude ? parseFloat(venue.location.longitude) : null,
      start_date: event.dates?.start?.localDate || new Date().toISOString().split('T')[0],
      start_time: event.dates?.start?.localTime || '20:00:00',
      category: classification?.segment?.name || 'Event',
      image_url: event.images?.[0]?.url || null,
      external_event_id: externalEventId,
      external_url: event.url || null,
      external_source: 'ticketmaster',
      is_auto_imported: true,
      user_id: null,
    };

    const { error } = await supabase.from('events').insert(eventData);

    if (error) {
      console.error('[IMPORT] Fehler beim Importieren:', error);
      return 'skipped';
    }

    console.log(`[IMPORT] Imported: ${event.name}`);
    return 'imported';
  }

  private async updateImportHistory(found: number, imported: number, skipped: number) {
    if (!this.importRunId) return;

    await supabase
      .from('ticketmaster_import_history')
      .update({
        total_found: found,
        imported_count: imported,
        skipped_count: skipped,
      })
      .eq('id', this.importRunId);
  }

  private async markImportCompleted(found: number, imported: number, skipped: number) {
    if (!this.importRunId) return;

    const { data: importRun } = await supabase
      .from('ticketmaster_import_history')
      .select('started_at')
      .eq('id', this.importRunId)
      .single();

    const duration = importRun
      ? Math.floor((Date.now() - new Date(importRun.started_at).getTime()) / 1000)
      : 0;

    await supabase
      .from('ticketmaster_import_history')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_found: found,
        imported_count: imported,
        skipped_count: skipped,
        duration_seconds: duration,
      })
      .eq('id', this.importRunId);
  }

  private async markImportFailed(errorMessage: string) {
    if (!this.importRunId) return;

    await supabase
      .from('ticketmaster_import_history')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq('id', this.importRunId);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getImportProgress(importRunId: string): Promise<ImportProgress | null> {
    const { data } = await supabase
      .from('ticketmaster_import_history')
      .select('*')
      .eq('id', importRunId)
      .single();

    if (!data) return null;

    const config = data.config as any;
    const cities = config?.cities || [];

    const isCompleted = data.status === 'completed' || data.status === 'failed';

    return {
      cityName: isCompleted ? 'Abgeschlossen' : 'N/A',
      cityIndex: isCompleted ? cities.length : cities.length - 1,
      totalCities: cities.length,
      eventsFound: data.total_found || 0,
      eventsImported: data.imported_count || 0,
      eventsSkipped: data.skipped_count || 0,
    };
  }
}

export const cityImportService = new TicketmasterCityImportService();
