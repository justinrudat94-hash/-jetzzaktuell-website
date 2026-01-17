import { supabase } from '@/lib/supabase';
import { ticketmasterService, TicketmasterEvent, TicketmasterSearchParams } from './ticketmasterService';

const TICKETMASTER_DEEP_PAGING_LIMIT = 1000;
const MAX_PAGE_SIZE = 200;
const RATE_LIMIT_DELAY_MS = 250;
const MAX_RETRY_ATTEMPTS = 3;

function formatTicketmasterDate(date: Date): string {
  return date.toISOString().split('.')[0] + 'Z';
}

export interface QuerySplit {
  id?: string;
  importRunId?: string;
  queryParams: TicketmasterSearchParams & {
    segmentId?: string;
    genreId?: string;
    subGenreId?: string;
    dmaId?: string;
  };
  queryLabel: string;
  priority: number;
  totalElements?: number;
  status: 'pending' | 'discovering' | 'importing' | 'completed' | 'failed' | 'skipped' | 'split_needed';
  pagesFetched?: number;
  eventsFound?: number;
  eventsImported?: number;
  eventsSkipped?: number;
  errorMessage?: string;
  retryCount?: number;
  parentSplitId?: string;
  splitReason?: string;
}

export interface ImportProgress {
  totalQueries: number;
  completedQueries: number;
  activeQuery?: QuerySplit;
  totalEventsFound: number;
  totalEventsImported: number;
  totalEventsSkipped: number;
  estimatedRemaining?: number;
}

export interface AdaptiveImportConfig {
  countryCode: string;
  startDate: Date;
  endDate: Date;
  segments?: string[];
  cities?: string[];
  mode: 'quick' | 'standard' | 'full' | 'adaptive';
  maxQueries?: number;
  autoSplit?: boolean;
}

class TicketmasterAdaptiveService {
  private queryQueue: QuerySplit[] = [];
  private currentImportRunId: string | null = null;
  private progressCallback?: (progress: ImportProgress) => void;
  private shouldStop = false;
  private metadataCache: Map<string, any> = new Map();

  async startAdaptiveImport(
    config: AdaptiveImportConfig,
    onProgress?: (progress: ImportProgress) => void
  ): Promise<void> {
    this.shouldStop = false;
    this.progressCallback = onProgress;
    this.queryQueue = [];

    const importRunId = await this.createImportRun(config);
    this.currentImportRunId = importRunId;

    await this.generateInitialQueries(config);

    await this.processQueryQueue();

    await this.finalizeImportRun();
  }

  stopImport(): void {
    this.shouldStop = true;
  }

  private async createImportRun(config: AdaptiveImportConfig): Promise<string> {
    const { data, error } = await supabase
      .from('ticketmaster_import_history')
      .insert({
        mode: config.mode,
        config: config,
        status: 'running',
        started_at: new Date().toISOString(),
        total_found: 0,
        imported_count: 0,
        skipped_count: 0,
        error_count: 0,
        is_auto_import: false,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  private async generateInitialQueries(config: AdaptiveImportConfig): Promise<void> {
    const timeWindows = this.generateTimeWindows(config.startDate, config.endDate, config.mode);

    const segments = config.segments || ['Music', 'Sports', 'Arts & Theatre', 'Film', 'Miscellaneous'];

    if (config.mode === 'quick') {
      for (const timeWindow of timeWindows.slice(0, 2)) {
        for (const segment of segments) {
          this.queryQueue.push({
            queryParams: {
              countryCode: config.countryCode,
              startDateTime: formatTicketmasterDate(timeWindow.start),
              endDateTime: formatTicketmasterDate(timeWindow.end),
              classificationName: segment,
              size: MAX_PAGE_SIZE,
              page: 0,
            },
            queryLabel: `${segment} (${this.formatDateRange(timeWindow.start, timeWindow.end)})`,
            priority: this.calculatePriority(timeWindow.start),
            status: 'pending',
          });
        }
      }
    } else if (config.mode === 'standard') {
      for (const timeWindow of timeWindows.slice(0, 8)) {
        for (const segment of segments) {
          this.queryQueue.push({
            queryParams: {
              countryCode: config.countryCode,
              startDateTime: formatTicketmasterDate(timeWindow.start),
              endDateTime: formatTicketmasterDate(timeWindow.end),
              classificationName: segment,
              size: MAX_PAGE_SIZE,
              page: 0,
            },
            queryLabel: `${segment} (${this.formatDateRange(timeWindow.start, timeWindow.end)})`,
            priority: this.calculatePriority(timeWindow.start),
            status: 'pending',
          });
        }
      }
    } else {
      for (const timeWindow of timeWindows) {
        for (const segment of segments) {
          this.queryQueue.push({
            queryParams: {
              countryCode: config.countryCode,
              startDateTime: formatTicketmasterDate(timeWindow.start),
              endDateTime: formatTicketmasterDate(timeWindow.end),
              classificationName: segment,
              size: MAX_PAGE_SIZE,
              page: 0,
            },
            queryLabel: `${segment} (${this.formatDateRange(timeWindow.start, timeWindow.end)})`,
            priority: this.calculatePriority(timeWindow.start),
            status: 'pending',
          });
        }
      }
    }

    this.queryQueue.sort((a, b) => a.priority - b.priority);

    await this.saveQueriesToDatabase();
  }

  private generateTimeWindows(
    startDate: Date,
    endDate: Date,
    mode: string
  ): Array<{ start: Date; end: Date }> {
    const windows: Array<{ start: Date; end: Date }> = [];
    let current = new Date(startDate);
    const end = new Date(endDate);

    let windowDays = 7;
    if (mode === 'quick') windowDays = 14;
    else if (mode === 'full') windowDays = 7;

    while (current < end) {
      const windowEnd = new Date(current);
      windowEnd.setDate(windowEnd.getDate() + windowDays);

      if (windowEnd > end) {
        windowEnd.setTime(end.getTime());
      }

      windows.push({
        start: new Date(current),
        end: new Date(windowEnd),
      });

      current = new Date(windowEnd);
      current.setDate(current.getDate() + 1);
    }

    return windows;
  }

  private calculatePriority(startDate: Date): number {
    const now = new Date();
    const daysUntil = Math.floor((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 7) return 1;
    if (daysUntil < 14) return 2;
    if (daysUntil < 30) return 3;
    if (daysUntil < 60) return 4;
    return 5;
  }

  private formatDateRange(start: Date, end: Date): string {
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    return `${formatDate(start)} to ${formatDate(end)}`;
  }

  private async saveQueriesToDatabase(): Promise<void> {
    if (!this.currentImportRunId) return;

    const queries = this.queryQueue.map(q => ({
      import_run_id: this.currentImportRunId,
      query_params: q.queryParams,
      query_label: q.queryLabel,
      priority: q.priority,
      status: q.status,
      parent_split_id: q.parentSplitId || null,
      split_reason: q.splitReason || null,
    }));

    const { error } = await supabase
      .from('ticketmaster_query_splits')
      .insert(queries);

    if (error) {
      console.error('Error saving queries to database:', error);
    }
  }

  private async processQueryQueue(): Promise<void> {
    const totalQueries = this.queryQueue.length;
    let completedQueries = 0;
    let totalEventsFound = 0;
    let totalEventsImported = 0;
    let totalEventsSkipped = 0;

    while (this.queryQueue.length > 0 && !this.shouldStop) {
      const query = this.queryQueue.shift()!;

      if (this.progressCallback) {
        this.progressCallback({
          totalQueries,
          completedQueries,
          activeQuery: query,
          totalEventsFound,
          totalEventsImported,
          totalEventsSkipped,
          estimatedRemaining: this.queryQueue.length,
        });
      }

      try {
        query.status = 'discovering';
        await this.updateQueryInDatabase(query);

        const discoveryResult = await this.discoverQuerySize(query);

        if (discoveryResult.needsSplit) {
          query.status = 'split_needed';
          query.totalElements = discoveryResult.totalElements;
          await this.updateQueryInDatabase(query);

          const splitQueries = await this.splitQuery(query, discoveryResult.totalElements!);
          this.queryQueue.unshift(...splitQueries);

          continue;
        }

        query.status = 'importing';
        query.totalElements = discoveryResult.totalElements;
        await this.updateQueryInDatabase(query);

        const importResult = await this.importQuery(query);

        query.status = 'completed';
        query.eventsFound = importResult.found;
        query.eventsImported = importResult.imported;
        query.eventsSkipped = importResult.skipped;
        query.pagesFetched = importResult.pagesFetched;
        await this.updateQueryInDatabase(query);

        totalEventsFound += importResult.found;
        totalEventsImported += importResult.imported;
        totalEventsSkipped += importResult.skipped;
        completedQueries++;

        await this.delay(RATE_LIMIT_DELAY_MS);

      } catch (error: any) {
        console.error('Error processing query:', error);
        query.status = 'failed';
        query.errorMessage = error.message;
        query.retryCount = (query.retryCount || 0) + 1;
        await this.updateQueryInDatabase(query);

        if (query.retryCount < MAX_RETRY_ATTEMPTS) {
          this.queryQueue.push(query);
        }
      }
    }

    if (this.progressCallback) {
      this.progressCallback({
        totalQueries,
        completedQueries,
        totalEventsFound,
        totalEventsImported,
        totalEventsSkipped,
      });
    }
  }

  private async discoverQuerySize(
    query: QuerySplit
  ): Promise<{ totalElements: number; needsSplit: boolean }> {
    const params = { ...query.queryParams, size: 1, page: 0 };

    const result = await ticketmasterService.searchEvents(params);
    const totalElements = result.page.totalElements;

    const maxReachable = Math.min(totalElements, TICKETMASTER_DEEP_PAGING_LIMIT);
    const needsSplit = totalElements > TICKETMASTER_DEEP_PAGING_LIMIT;

    return { totalElements: maxReachable, needsSplit };
  }

  private async splitQuery(
    query: QuerySplit,
    totalElements: number
  ): Promise<QuerySplit[]> {
    const splitQueries: QuerySplit[] = [];

    const startDate = new Date(query.queryParams.startDateTime!);
    const endDate = new Date(query.queryParams.endDateTime!);
    const midDate = new Date((startDate.getTime() + endDate.getTime()) / 2);

    splitQueries.push({
      queryParams: {
        ...query.queryParams,
        endDateTime: formatTicketmasterDate(midDate),
      },
      queryLabel: `${query.queryLabel} (Part 1)`,
      priority: query.priority,
      status: 'pending',
      parentSplitId: query.id,
      splitReason: 'time_range_too_many_results',
    });

    splitQueries.push({
      queryParams: {
        ...query.queryParams,
        startDateTime: formatTicketmasterDate(midDate),
      },
      queryLabel: `${query.queryLabel} (Part 2)`,
      priority: query.priority,
      status: 'pending',
      parentSplitId: query.id,
      splitReason: 'time_range_too_many_results',
    });

    console.log(`Split query "${query.queryLabel}" (${totalElements} events) into 2 sub-queries`);

    return splitQueries;
  }

  private async importQuery(
    query: QuerySplit
  ): Promise<{ found: number; imported: number; skipped: number; pagesFetched: number }> {
    const sourceId = await ticketmasterService.getOrCreateDefaultSource();

    let found = 0;
    let imported = 0;
    let skipped = 0;
    let pagesFetched = 0;

    const maxPages = Math.ceil(
      Math.min(query.totalElements || TICKETMASTER_DEEP_PAGING_LIMIT, TICKETMASTER_DEEP_PAGING_LIMIT) / MAX_PAGE_SIZE
    );

    for (let page = 0; page < maxPages && !this.shouldStop; page++) {
      const params = { ...query.queryParams, page };

      const result = await ticketmasterService.searchEvents(params);
      const events = result.events;

      if (events.length === 0) break;

      found += events.length;
      pagesFetched++;

      const bulkResult = await ticketmasterService.bulkImportEvents(events, sourceId);
      imported += bulkResult.success;
      skipped += bulkResult.skipped;

      await this.delay(RATE_LIMIT_DELAY_MS);
    }

    return { found, imported, skipped, pagesFetched };
  }

  private async updateQueryInDatabase(query: QuerySplit): Promise<void> {
    if (!query.id && this.currentImportRunId) {
      const { data, error } = await supabase
        .from('ticketmaster_query_splits')
        .insert({
          import_run_id: this.currentImportRunId,
          query_params: query.queryParams,
          query_label: query.queryLabel,
          priority: query.priority,
          status: query.status,
          total_elements: query.totalElements,
          pages_fetched: query.pagesFetched,
          events_found: query.eventsFound,
          events_imported: query.eventsImported,
          events_skipped: query.eventsSkipped,
          error_message: query.errorMessage,
          retry_count: query.retryCount,
          parent_split_id: query.parentSplitId,
          split_reason: query.splitReason,
          started_at: query.status === 'importing' ? new Date().toISOString() : null,
          completed_at: query.status === 'completed' ? new Date().toISOString() : null,
        })
        .select('id')
        .single();

      if (!error && data) {
        query.id = data.id;
      }
    } else if (query.id) {
      await supabase
        .from('ticketmaster_query_splits')
        .update({
          status: query.status,
          total_elements: query.totalElements,
          pages_fetched: query.pagesFetched,
          events_found: query.eventsFound,
          events_imported: query.eventsImported,
          events_skipped: query.eventsSkipped,
          error_message: query.errorMessage,
          retry_count: query.retryCount,
          completed_at: query.status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', query.id);
    }
  }

  private async finalizeImportRun(): Promise<void> {
    if (!this.currentImportRunId) return;

    const { data: queries } = await supabase
      .from('ticketmaster_query_splits')
      .select('events_found, events_imported, events_skipped')
      .eq('import_run_id', this.currentImportRunId);

    const totals = queries?.reduce(
      (acc, q) => ({
        found: acc.found + (q.events_found || 0),
        imported: acc.imported + (q.events_imported || 0),
        skipped: acc.skipped + (q.events_skipped || 0),
      }),
      { found: 0, imported: 0, skipped: 0 }
    ) || { found: 0, imported: 0, skipped: 0 };

    await supabase
      .from('ticketmaster_import_history')
      .update({
        status: this.shouldStop ? 'stopped' : 'completed',
        completed_at: new Date().toISOString(),
        total_found: totals.found,
        imported_count: totals.imported,
        skipped_count: totals.skipped,
        error_count: 0,
      })
      .eq('id', this.currentImportRunId);

    this.currentImportRunId = null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchGenres(segmentName: string): Promise<any[]> {
    const cacheKey = `genres_${segmentName}`;

    if (this.metadataCache.has(cacheKey)) {
      return this.metadataCache.get(cacheKey);
    }

    const { data } = await supabase
      .from('ticketmaster_metadata_cache')
      .select('data')
      .eq('cache_type', 'genre')
      .eq('cache_key', segmentName)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (data) {
      this.metadataCache.set(cacheKey, data.data);
      return data.data;
    }

    return [];
  }
}

export const ticketmasterAdaptiveService = new TicketmasterAdaptiveService();
