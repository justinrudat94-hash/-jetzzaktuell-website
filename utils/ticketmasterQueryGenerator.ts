export interface QueryConfig {
  mode: 'quick' | 'standard' | 'full' | 'adaptive';
  timePeriods: Array<{ start: number; end: number; label: string }>;
  categories: string[];
  cities: string[];
  countryCode: string;
  smartSplit: boolean;
  maxQueriesPerRun?: number;
}

export interface TicketmasterQuery {
  id: string;
  timeStart: string;
  timeEnd: string;
  segment?: string;
  city?: string;
  countryCode: string;
  label: string;
  priority: number;
}

const TICKETMASTER_SEGMENTS = {
  music: 'Music',
  sports: 'Sports',
  'arts-theatre': 'Arts & Theatre',
  family: 'Family',
  film: 'Film',
  miscellaneous: 'Miscellaneous',
};

const DEFAULT_TIME_PERIODS = [
  { start: 0, end: 60, label: 'Nächste 2 Monate' },
  { start: 61, end: 120, label: 'Monat 3-4' },
  { start: 121, end: 180, label: 'Monat 5-6' },
  { start: 181, end: 270, label: 'Monat 7-9' },
  { start: 271, end: 365, label: 'Monat 10-12' },
];

const TOP_GERMAN_CITIES = [
  'Berlin',
  'München',
  'Hamburg',
  'Köln',
  'Frankfurt',
  'Stuttgart',
  'Düsseldorf',
  'Dortmund',
  'Leipzig',
  'Dresden',
  'Hannover',
  'Nürnberg',
];

function formatDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

function generateQueryId(
  timeStart: string,
  timeEnd: string,
  segment?: string,
  city?: string
): string {
  const parts = [timeStart, timeEnd];
  if (segment) parts.push(segment);
  if (city) parts.push(city);
  return parts.join('_');
}

export function getDefaultConfig(mode: QueryConfig['mode']): QueryConfig {
  const baseConfig: QueryConfig = {
    mode,
    timePeriods: DEFAULT_TIME_PERIODS,
    categories: [],
    cities: [],
    countryCode: 'DE',
    smartSplit: true,
    maxQueriesPerRun: 100,
  };

  switch (mode) {
    case 'quick':
      return {
        ...baseConfig,
        timePeriods: [{ start: 0, end: 90, label: 'Nächste 3 Monate' }],
        categories: Object.keys(TICKETMASTER_SEGMENTS),
      };

    case 'standard':
      return {
        ...baseConfig,
        timePeriods: DEFAULT_TIME_PERIODS.slice(0, 3),
        categories: Object.keys(TICKETMASTER_SEGMENTS),
      };

    case 'full':
      return {
        ...baseConfig,
        categories: Object.keys(TICKETMASTER_SEGMENTS),
        cities: TOP_GERMAN_CITIES.slice(0, 3),
      };

    case 'adaptive':
      return {
        ...baseConfig,
        categories: Object.keys(TICKETMASTER_SEGMENTS),
        smartSplit: true,
      };

    default:
      return baseConfig;
  }
}

export function generateQueryMatrix(config: QueryConfig): TicketmasterQuery[] {
  const queries: TicketmasterQuery[] = [];

  for (const period of config.timePeriods) {
    const timeStart = formatDate(period.start);
    const timeEnd = formatDate(period.end);

    if (config.categories.length === 0) {
      queries.push({
        id: generateQueryId(timeStart, timeEnd),
        timeStart,
        timeEnd,
        countryCode: config.countryCode,
        label: `${period.label} • ${config.countryCode}`,
        priority: period.start,
      });
      continue;
    }

    for (const categoryKey of config.categories) {
      const segment = TICKETMASTER_SEGMENTS[categoryKey as keyof typeof TICKETMASTER_SEGMENTS];

      if (!segment) continue;

      if (config.cities.length === 0) {
        queries.push({
          id: generateQueryId(timeStart, timeEnd, segment),
          timeStart,
          timeEnd,
          segment,
          countryCode: config.countryCode,
          label: `${segment} • ${period.label} • ${config.countryCode}`,
          priority: period.start,
        });
      } else {
        for (const city of config.cities) {
          queries.push({
            id: generateQueryId(timeStart, timeEnd, segment, city),
            timeStart,
            timeEnd,
            segment,
            city,
            countryCode: config.countryCode,
            label: `${segment} • ${period.label} • ${city}`,
            priority: period.start,
          });
        }
      }
    }
  }

  queries.sort((a, b) => a.priority - b.priority);

  if (config.maxQueriesPerRun && queries.length > config.maxQueriesPerRun) {
    return queries.slice(0, config.maxQueriesPerRun);
  }

  return queries;
}

export function estimateImportTime(queryCount: number): { min: number; max: number } {
  const avgTimePerQuery = 20;
  const minTime = Math.ceil((queryCount * avgTimePerQuery * 0.7) / 60);
  const maxTime = Math.ceil((queryCount * avgTimePerQuery * 1.3) / 60);

  return { min: minTime, max: maxTime };
}

export function estimateEventCount(queryCount: number, mode: QueryConfig['mode']): { min: number; max: number } {
  let avgEventsPerQuery = 500;

  switch (mode) {
    case 'quick':
      avgEventsPerQuery = 600;
      break;
    case 'standard':
      avgEventsPerQuery = 500;
      break;
    case 'full':
      avgEventsPerQuery = 450;
      break;
    case 'adaptive':
      avgEventsPerQuery = 550;
      break;
  }

  return {
    min: Math.floor(queryCount * avgEventsPerQuery * 0.6),
    max: Math.ceil(queryCount * avgEventsPerQuery * 1.4),
  };
}

export const CITY_OPTIONS = TOP_GERMAN_CITIES;

export const CATEGORY_OPTIONS = Object.entries(TICKETMASTER_SEGMENTS).map(([key, value]) => ({
  key,
  label: value,
  description: getCategoryDescription(key),
}));

function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    music: 'Konzerte, Festivals, Live-Musik',
    sports: 'Fußball, Basketball, Tennis, etc.',
    'arts-theatre': 'Theater, Musicals, Opern',
    family: 'Kinder-Events, Familien-Shows',
    film: 'Kino-Events, Premieren',
    miscellaneous: 'Sonstige Events',
  };
  return descriptions[category] || '';
}
