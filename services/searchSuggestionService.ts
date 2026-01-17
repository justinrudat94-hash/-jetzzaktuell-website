import { EVENT_CATEGORIES, SEASON_SPECIALS } from '../constants';
import { GERMAN_CITIES, getTopCities } from '../constants/GermanCities';
import { SearchHistoryItem } from './searchHistoryService';
import {
  SearchSuggestion,
  calculateCategoryScore,
  calculateSeasonScore,
  calculateEventScore,
  calculatePlaceScore,
  getSearchBonus,
  detectSearchIntent,
  sortSuggestionsByScore,
  groupSuggestions,
} from '../utils/searchScoring';

interface FormattedEvent {
  id: string;
  title: string;
  location: string;
  attendees: number;
}

export const generateSearchSuggestions = (
  query: string,
  events: FormattedEvent[],
  searchHistory: SearchHistoryItem[],
  googlePlaces: Array<{ description: string }>
): SearchSuggestion[] => {
  if (!query || query.length < 1) {
    return [];
  }

  const suggestions: SearchSuggestion[] = [];
  const topCities = getTopCities(20).map(c => c.name);
  const intent = detectSearchIntent(query, topCities);

  const minQueryLength = 2;
  const isLongEnoughForFullSearch = query.length >= 3;

  const historySuggestions = searchHistory
    .filter(item => item.search_term.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 3)
    .map(item => ({
      text: item.search_term,
      type: 'history' as const,
      score: 150 + (item.search_count * 5),
      searchCount: item.search_count,
      icon: 'history',
    }));

  suggestions.push(...historySuggestions);

  if (query.length >= minQueryLength) {
    const categorySuggestions = EVENT_CATEGORIES.map(category => {
      const score = calculateCategoryScore(category, query);
      if (score === 0) return null;

      const historyBonus = getSearchBonus(searchHistory, category);
      return {
        text: category,
        type: 'category' as const,
        score: score + historyBonus,
      };
    }).filter((s): s is SearchSuggestion => s !== null && s.score > 0);

    suggestions.push(...categorySuggestions);

    const seasonSuggestions = SEASON_SPECIALS.map(season => {
      const score = calculateSeasonScore(season, query);
      if (score === 0) return null;

      const historyBonus = getSearchBonus(searchHistory, season);
      return {
        text: season,
        type: 'season' as const,
        score: score + historyBonus,
      };
    }).filter((s): s is SearchSuggestion => s !== null && s.score > 0);

    suggestions.push(...seasonSuggestions);
  }

  if (isLongEnoughForFullSearch) {
    const eventSuggestions = events
      .map(event => {
        const score = calculateEventScore(event.title, query, event.attendees);
        if (score < 50) return null;

        const historyBonus = getSearchBonus(searchHistory, event.title);
        return {
          text: event.title,
          type: 'event' as const,
          score: score + historyBonus,
        };
      })
      .filter((s): s is SearchSuggestion => s !== null && s.score > 0)
      .slice(0, 10);

    suggestions.push(...eventSuggestions);
  }

  const citySuggestions = GERMAN_CITIES.map(city => {
    const score = calculatePlaceScore(city.name, query, city.priority <= 2);
    if (score === 0) return null;

    const historyBonus = getSearchBonus(searchHistory, city.name);
    return {
      text: city.name,
      type: 'place' as const,
      score: score + historyBonus,
    };
  }).filter((s): s is SearchSuggestion => s !== null && s.score > 0);

  suggestions.push(...citySuggestions);

  if (isLongEnoughForFullSearch && googlePlaces.length > 0) {
    const placeSuggestions = googlePlaces
      .map(place => {
        const score = calculatePlaceScore(place.description, query, false);
        if (score === 0) return null;

        const historyBonus = getSearchBonus(searchHistory, place.description);
        return {
          text: place.description,
          type: 'place' as const,
          score: score + historyBonus - 10,
        };
      })
      .filter((s): s is SearchSuggestion => s !== null && s.score > 0)
      .slice(0, 5);

    suggestions.push(...placeSuggestions);
  }

  const uniqueSuggestions = Array.from(
    new Map(suggestions.map(s => [s.text.toLowerCase(), s])).values()
  );

  return sortSuggestionsByScore(uniqueSuggestions).slice(0, 12);
};

export const generateEmptyStateSuggestions = (
  searchHistory: SearchHistoryItem[]
): { topSearches: SearchHistoryItem[]; recentSearches: SearchHistoryItem[] } => {
  const topSearches = searchHistory
    .sort((a, b) => b.search_count - a.search_count)
    .slice(0, 3);

  const recentSearches = searchHistory
    .sort((a, b) => new Date(b.last_searched_at).getTime() - new Date(a.last_searched_at).getTime())
    .slice(0, 3)
    .filter(recent => !topSearches.some(top => top.id === recent.id));

  return { topSearches, recentSearches };
};

export const getPopularCategories = (): string[] => {
  return ['Rock', 'Pop', 'Comedy', 'Festival', 'Techno', 'Theatre', 'Party & Clubbing', 'Essen & Trinken'];
};

export const getSeasonalSuggestions = (): string[] => {
  const now = new Date();
  const month = now.getMonth();

  const seasonalMap: Record<number, string[]> = {
    0: ['Neujahr', 'Silvester', 'Winterevents'],
    1: ['Valentinstag', 'Karneval/Fasching'],
    2: ['Ostern', 'Frühlingsevents'],
    3: ['Ostern', 'Frühlingsevents'],
    4: ['Maifeiertag', 'Muttertag', 'Vatertag'],
    5: ['Pfingsten', 'Sommerevents'],
    6: ['Sommerevents', 'Festival'],
    7: ['Sommerevents', 'Festival'],
    8: ['Oktoberfest', 'Herbstevents'],
    9: ['Oktoberfest', 'Halloween', 'Herbstevents'],
    10: ['Halloween', 'Martinstag', 'Advent'],
    11: ['Advent', 'Nikolaus', 'Weihnachten', 'Silvester'],
  };

  return seasonalMap[month] || [];
};

export const getCityCoordinates = (cityName: string): { latitude: number; longitude: number } | null => {
  const city = GERMAN_CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase());
  if (city) {
    return { latitude: city.latitude, longitude: city.longitude };
  }
  return null;
};
