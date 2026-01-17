import { supabase } from '@/lib/supabase';

export interface RewardTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  metadata: any;
  created_at: string;
}

export interface UserStats {
  user_id: string;
  total_coins: number;
  total_likes_received: number;
  total_likes_given: number;
  total_events_created: number;
  total_events_joined: number;
  total_livestreams: number;
  total_followers: number;
  creator_level: string;
  xp_points: number;
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreatorLevel {
  id: string;
  level_name: string;
  min_likes: number;
  min_events: number;
  min_livestreams: number;
  benefits: {
    description: string;
    coin_multiplier: number;
    [key: string]: any;
  };
  display_order: number;
}

// Reward amounts (Phase 1)
export const REWARD_AMOUNTS = {
  EVENT_JOINED: 5,
  EVENT_CREATED: 10,
  LIVESTREAM_HOSTED: 20,
  LEVEL_UP_BONUS: 100,
};

export const REWARD_REASONS = {
  EVENT_JOINED: 'event_joined',
  EVENT_CREATED: 'event_created',
  LIVESTREAM_HOSTED: 'livestream_hosted',
  LEVEL_UP: 'level_up',
  MANUAL_AWARD: 'manual_award',
} as const;

export const getUserStats = async (userId: string): Promise<UserStats | null> => {
  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }
};

export const getCurrentUserStats = async (): Promise<UserStats | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return await getUserStats(user.id);
  } catch (error) {
    console.error('Error fetching current user stats:', error);
    return null;
  }
};

export const getRewardHistory = async (
  userId: string,
  limit: number = 50
): Promise<RewardTransaction[]> => {
  try {
    const { data, error } = await supabase
      .from('reward_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching reward history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching reward history:', error);
    return [];
  }
};

export const getCurrentUserRewardHistory = async (
  limit: number = 50
): Promise<RewardTransaction[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    return await getRewardHistory(user.id, limit);
  } catch (error) {
    console.error('Error fetching current user reward history:', error);
    return [];
  }
};

export const awardCoins = async (
  userId: string,
  amount: number,
  reason: string,
  metadata: any = {}
): Promise<{ error: any }> => {
  try {
    const description = metadata.event_id
      ? `Event: ${metadata.event_id}`
      : metadata.livestream_id
        ? `Livestream: ${metadata.livestream_id}`
        : reason;

    const { error } = await supabase.rpc('award_coins', {
      p_user_id: userId,
      p_amount: amount,
      p_transaction_type: reason,
      p_description: description,
    });

    if (error) {
      console.error('Error awarding coins:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Error awarding coins:', error);
    return { error };
  }
};

export const awardEventCreationCoins = async (eventId: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await awardCoins(
      user.id,
      REWARD_AMOUNTS.EVENT_CREATED,
      REWARD_REASONS.EVENT_CREATED,
      { event_id: eventId }
    );

    const { data: currentStats } = await supabase
      .from('user_stats')
      .select('total_events_created')
      .eq('user_id', user.id)
      .maybeSingle();

    await supabase
      .from('user_stats')
      .update({
        total_events_created: (currentStats?.total_events_created || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
  } catch (error) {
    console.error('Error awarding event creation coins:', error);
  }
};

export const awardEventJoinCoins = async (eventId: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await awardCoins(
      user.id,
      REWARD_AMOUNTS.EVENT_JOINED,
      REWARD_REASONS.EVENT_JOINED,
      { event_id: eventId }
    );

    const { data: currentStats } = await supabase
      .from('user_stats')
      .select('total_events_joined')
      .eq('user_id', user.id)
      .maybeSingle();

    await supabase
      .from('user_stats')
      .update({
        total_events_joined: (currentStats?.total_events_joined || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
  } catch (error) {
    console.error('Error awarding event join coins:', error);
  }
};

export const awardLivestreamCoins = async (
  livestreamId: string,
  viewerCount: number
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (viewerCount >= 10) {
      await awardCoins(
        user.id,
        REWARD_AMOUNTS.LIVESTREAM_HOSTED,
        REWARD_REASONS.LIVESTREAM_HOSTED,
        { livestream_id: livestreamId, viewer_count: viewerCount }
      );

      const { data: currentStats } = await supabase
        .from('user_stats')
        .select('total_livestreams')
        .eq('user_id', user.id)
        .maybeSingle();

      await supabase
        .from('user_stats')
        .update({
          total_livestreams: (currentStats?.total_livestreams || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    }
  } catch (error) {
    console.error('Error awarding livestream coins:', error);
  }
};

export const getCreatorLevels = async (): Promise<CreatorLevel[]> => {
  try {
    const { data, error } = await supabase
      .from('creator_levels')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching creator levels:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching creator levels:', error);
    return [];
  }
};

export const getUserRank = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('get_user_rank', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error fetching user rank:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('Error fetching user rank:', error);
    return 0;
  }
};

export const getTopCreators = async (limit: number = 10): Promise<UserStats[]> => {
  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select(`
        *,
        profiles!user_stats_user_id_fkey (
          name,
          city,
          avatar_url
        )
      `)
      .order('total_coins', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching top creators:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching top creators:', error);
    return [];
  }
};

export const formatRewardReason = (reason: string): string => {
  const reasonMap: { [key: string]: string } = {
    event_joined: 'Event beigetreten',
    event_created: 'Event erstellt',
    livestream_hosted: 'Livestream gehostet',
    level_up: 'Level aufgestiegen',
    manual_award: 'Manuelle Vergabe',
  };

  return reasonMap[reason] || reason;
};

export const formatCoins = (amount: number): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toString();
};

export const getLevelColor = (level: string): string => {
  const levelColors: { [key: string]: string } = {
    Starter: '#94A3B8',
    Pro: '#3B82F6',
    Elite: '#8B5CF6',
    Partner: '#F59E0B',
  };

  return levelColors[level] || '#94A3B8';
};

export const getLevelProgress = (stats: UserStats, levels: CreatorLevel[]): {
  currentLevel: CreatorLevel | null;
  nextLevel: CreatorLevel | null;
  progress: number;
} => {
  const currentLevelIndex = levels.findIndex(l => l.level_name === stats.creator_level);
  const currentLevel = levels[currentLevelIndex] || null;
  const nextLevel = levels[currentLevelIndex + 1] || null;

  if (!nextLevel) {
    return { currentLevel, nextLevel: null, progress: 100 };
  }

  const nextMinFollowers = nextLevel.benefits?.min_followers || 0;
  const progress = Math.min(
    100,
    (stats.total_followers / nextMinFollowers) * 100
  );

  return { currentLevel, nextLevel, progress };
};
