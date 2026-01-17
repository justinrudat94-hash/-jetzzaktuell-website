import { TicketmasterEvent } from './ticketmasterService';

export interface EventPreview extends TicketmasterEvent {
  previewImage?: string;
  aiStatus?: 'safe' | 'review' | 'rejected';
  aiReason?: string;
  affiliateUrl?: string;
}

const CATEGORY_IMAGE_QUERIES: Record<string, string> = {
  'Musik': 'concert stage music',
  'Sport': 'stadium sports',
  'Kunst': 'art gallery exhibition',
  'Theater': 'theater performance stage',
  'Comedy': 'comedy show stage',
  'Film': 'cinema movie theater',
  'Familie': 'family event festival',
  'Sonstiges': 'event celebration',
};

class EventPreviewService {
  private async searchPexelsImage(query: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/search-pexels-image?query=${encodeURIComponent(query)}&per_page=1`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Pexels search failed');
        return null;
      }

      const data = await response.json();
      return data.photos?.[0]?.src?.large || null;
    } catch (error) {
      console.error('Error searching Pexels:', error);
      return null;
    }
  }

  private async moderateEvent(event: TicketmasterEvent): Promise<{ status: 'safe' | 'review' | 'rejected'; reason?: string }> {
    try {
      const content = `${event.name} - ${event.info || ''} - ${event.pleaseNote || ''}`;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/moderate-content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            contentType: 'event',
            contentId: event.id,
          }),
        }
      );

      if (!response.ok) {
        console.log('AI moderation skipped (API not configured)');
        return { status: 'safe' };
      }

      const result = await response.json();

      if (result.note) {
        console.log('AI moderation skipped:', result.note);
        return { status: 'safe' };
      }

      if (result.autoAction === 'blocked') {
        return { status: 'rejected', reason: result.flaggedCategories?.join(', ') || 'Unangemessener Inhalt' };
      }

      if (result.autoAction === 'needs_review') {
        return { status: 'review', reason: 'Manuelle Prüfung empfohlen' };
      }

      return { status: 'safe' };
    } catch (error) {
      console.log('Error moderating event, defaulting to safe:', error);
      return { status: 'safe' };
    }
  }

  private getBestImage(event: TicketmasterEvent): string | null {
    if (!event.images || event.images.length === 0) return null;

    const largeImage = event.images.find(img => img.width >= 640);
    return largeImage?.url || event.images[0]?.url || null;
  }

  private getCategoryForEvent(event: TicketmasterEvent): string {
    const classification = event.classifications?.[0];
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

  async enrichEventWithPreview(event: TicketmasterEvent): Promise<EventPreview> {
    const ticketmasterImage = this.getBestImage(event);
    let previewImage = ticketmasterImage;

    if (!previewImage) {
      const category = this.getCategoryForEvent(event);
      const searchQuery = CATEGORY_IMAGE_QUERIES[category] || 'event celebration';
      const pexelsImage = await this.searchPexelsImage(searchQuery);
      previewImage = pexelsImage || undefined;
    }

    const moderation = await this.moderateEvent(event);

    return {
      ...event,
      previewImage,
      aiStatus: moderation.status,
      aiReason: moderation.reason,
      affiliateUrl: event.url,
    };
  }

  async enrichMultipleEvents(events: TicketmasterEvent[]): Promise<EventPreview[]> {
    const enrichedEvents: EventPreview[] = [];

    for (const event of events) {
      try {
        const enriched = await this.enrichEventWithPreview(event);
        enrichedEvents.push(enriched);
      } catch (error) {
        console.error(`Failed to enrich event ${event.name}:`, error);
        enrichedEvents.push({
          ...event,
          aiStatus: 'review',
          aiReason: 'Fehler bei Verarbeitung',
          affiliateUrl: event.url,
        });
      }
    }

    return enrichedEvents;
  }
}

export const eventPreviewService = new EventPreviewService();
