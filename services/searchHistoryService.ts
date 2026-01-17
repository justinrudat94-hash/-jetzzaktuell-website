import { supabase } from '../lib/supabase';

const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export interface SearchHistoryItem {
  id: string;
  user_id: string;
  search_term: string;
  search_type: 'event' | 'place' | 'category' | 'season';
  search_count: number;
  last_searched_at: string;
  created_at: string;
}

export const saveSearchToHistory = async (
  userId: string,
  searchTerm: string,
  searchType: 'event' | 'place' | 'category' | 'season'
): Promise<void> => {
  if (!userId || !searchTerm.trim() || !isValidUUID(userId)) return;

  const normalizedTerm = searchTerm.trim().toLowerCase();

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('search_history')
      .select('id, search_count')
      .eq('user_id', userId)
      .eq('search_term', normalizedTerm)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching search history:', fetchError);
      return;
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('search_history')
        .update({
          search_count: existing.search_count + 1,
          last_searched_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error updating search history:', updateError);
      }
    } else {
      const { error: insertError } = await supabase
        .from('search_history')
        .insert({
          user_id: userId,
          search_term: normalizedTerm,
          search_type: searchType,
          search_count: 1,
        });

      if (insertError) {
        console.error('Error inserting search history:', insertError);
      }
    }
  } catch (error) {
    console.error('Error in saveSearchToHistory:', error);
  }
};

export const getUserSearchHistory = async (
  userId: string,
  limit: number = 20
): Promise<SearchHistoryItem[]> => {
  if (!userId || !isValidUUID(userId)) return [];

  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('last_searched_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching search history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserSearchHistory:', error);
    return [];
  }
};

export const getTopSearches = async (
  userId: string,
  limit: number = 10
): Promise<SearchHistoryItem[]> => {
  if (!userId || !isValidUUID(userId)) return [];

  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('search_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching top searches:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getTopSearches:', error);
    return [];
  }
};

export const getRecentSearches = async (
  userId: string,
  limit: number = 5
): Promise<SearchHistoryItem[]> => {
  if (!userId || !isValidUUID(userId)) return [];

  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('last_searched_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent searches:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getRecentSearches:', error);
    return [];
  }
};

export const clearSearchHistory = async (userId: string): Promise<boolean> => {
  if (!userId || !isValidUUID(userId)) return false;

  try {
    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing search history:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in clearSearchHistory:', error);
    return false;
  }
};

export const deleteSearchItem = async (
  userId: string,
  searchId: string
): Promise<boolean> => {
  if (!userId || !searchId || !isValidUUID(userId)) return false;

  try {
    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('id', searchId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting search item:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteSearchItem:', error);
    return false;
  }
};

export const getSearchBonus = (searchHistory: SearchHistoryItem[], term: string): number => {
  const normalizedTerm = term.toLowerCase();
  const match = searchHistory.find(
    item => item.search_term.toLowerCase() === normalizedTerm
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
