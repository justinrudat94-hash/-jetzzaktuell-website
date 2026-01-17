import { EVENT_CATEGORIES, SEASON_SPECIALS } from '../constants';
import { SearchHistoryItem } from '../services/searchHistoryService';

export interface SearchSuggestion {
  text: string;
  type: 'category' | 'season' | 'event' | 'place' | 'history';
  score: number;
  searchCount?: number;
  icon?: string;
}

export const normalizeForSearch = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss');
};

export const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const isWordBoundaryMatch = (text: string, query: string): boolean => {
  if (!text || !query) return false;

  const normalizedText = normalizeForSearch(text);
  const normalizedQuery = normalizeForSearch(query);

  const escapedQuery = escapeRegex(normalizedQuery);
  const wordBoundaryRegex = new RegExp(`\\b${escapedQuery}`, 'i');

  return wordBoundaryRegex.test(normalizedText);
};

export const isExactMatch = (text: string, query: string): boolean => {
  return normalizeForSearch(text) === normalizeForSearch(query);
};

export const containsMatch = (text: string, query: string): boolean => {
  const normalizedText = normalizeForSearch(text);
  const normalizedQuery = normalizeForSearch(query);
  return normalizedText.includes(normalizedQuery);
};

export const calculateCategoryScore = (category: string, query: string): number => {
  if (isExactMatch(category, query)) return 100;
  if (isWordBoundaryMatch(category, query)) return 90;
  return 0;
};

export const calculateSeasonScore = (season: string, query: string): number => {
  if (isExactMatch(season, query)) return 95;
  if (isWordBoundaryMatch(season, query)) return 85;
  return 0;
};

export const calculateEventScore = (eventTitle: string, query: string, attendees: number = 0): number => {
  if (isExactMatch(eventTitle, query)) return 90;
  if (isWordBoundaryMatch(eventTitle, query)) {
    const popularityBonus = Math.min(attendees / 10, 20);
    return 70 + popularityBonus;
  }
  if (containsMatch(eventTitle, query)) return 30;
  return 0;
};

export const calculatePlaceScore = (placeName: string, query: string, isTopCity: boolean = false): number => {
  if (isExactMatch(placeName, query)) return isTopCity ? 100 : 90;
  if (isWordBoundaryMatch(placeName, query)) return isTopCity ? 95 : 80;
  if (containsMatch(placeName, query)) return 40;
  return 0;
};

export const getSearchBonus = (searchHistory: SearchHistoryItem[], term: string): number => {
  const normalizedTerm = normalizeForSearch(term);
  const match = searchHistory.find(
    item => normalizeForSearch(item.search_term) === normalizedTerm
  );

  if (!match) return 0;

  const daysSinceLastSearch = Math.floor(
    (Date.now() - new Date(match.last_searched_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  let bonus = 0;

  if (match.search_count > 5) {
    bonus += 30;
  } else if (match.search_count > 2) {
    bonus += 20;
  } else if (match.search_count >= 1) {
    bonus += 10;
  }

  if (daysSinceLastSearch <= 7) {
    bonus += 15;
  } else if (daysSinceLastSearch <= 30) {
    bonus += 5;
  }

  return bonus;
};

export const detectSearchIntent = (query: string, topCities: string[]): 'event' | 'place' | 'mixed' => {
  const normalizedQuery = normalizeForSearch(query);

  const isCityMatch = topCities.some(city =>
    normalizeForSearch(city).startsWith(normalizedQuery)
  );

  const isCategoryMatch = EVENT_CATEGORIES.some(cat =>
    normalizeForSearch(cat).startsWith(normalizedQuery)
  );

  const isSeasonMatch = SEASON_SPECIALS.some(season =>
    normalizeForSearch(season).startsWith(normalizedQuery)
  );

  if (isCityMatch && (isCategoryMatch || isSeasonMatch)) return 'mixed';
  if (isCityMatch) return 'place';
  if (isCategoryMatch || isSeasonMatch) return 'event';

  return 'mixed';
};

export const sortSuggestionsByScore = (suggestions: SearchSuggestion[]): SearchSuggestion[] => {
  return suggestions.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    const typeOrder: Record<string, number> = {
      history: 0,
      category: 1,
      season: 1,
      event: 2,
      place: 3,
    };

    const aOrder = typeOrder[a.type] || 999;
    const bOrder = typeOrder[b.type] || 999;

    if (aOrder !== bOrder) return aOrder - bOrder;

    return a.text.localeCompare(b.text);
  });
};

export const groupSuggestions = (suggestions: SearchSuggestion[]) => {
  const history = suggestions.filter(s => s.type === 'history');
  const categories = suggestions.filter(s => s.type === 'category' || s.type === 'season');
  const events = suggestions.filter(s => s.type === 'event');
  const places = suggestions.filter(s => s.type === 'place');

  return {
    history: history.slice(0, 3),
    categories: categories.slice(0, 4),
    events: events.slice(0, 4),
    places: places.slice(0, 3),
  };
};

export const highlightMatch = (text: string, query: string): { before: string; match: string; after: string } | null => {
  if (!query) return null;

  const normalizedText = normalizeForSearch(text);
  const normalizedQuery = normalizeForSearch(query);

  const index = normalizedText.indexOf(normalizedQuery);
  if (index === -1) return null;

  return {
    before: text.substring(0, index),
    match: text.substring(index, index + query.length),
    after: text.substring(index + query.length),
  };
};
