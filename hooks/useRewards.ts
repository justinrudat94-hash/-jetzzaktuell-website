import { useState, useEffect } from 'react';
import { useAuth } from '@/utils/authContext';
import {
  getCurrentUserStats,
  getCreatorLevels,
  getLevelProgress,
  getUserRank,
  UserStats,
  CreatorLevel,
} from '@/services/rewardService';

export const useRewards = () => {
  const { user, isGuest } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [levels, setLevels] = useState<CreatorLevel[]>([]);
  const [rank, setRank] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadRewardData();
  }, [user, isGuest, refreshKey]);

  const loadRewardData = async () => {
    if (isGuest || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [userStats, creatorLevels, userRank] = await Promise.all([
        getCurrentUserStats(),
        getCreatorLevels(),
        user ? getUserRank(user.id) : Promise.resolve(0),
      ]);

      setStats(userStats);
      setLevels(creatorLevels);
      setRank(userRank);
    } catch (error) {
      console.error('Error loading reward data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const levelProgress = stats && levels.length > 0
    ? getLevelProgress(stats, levels)
    : { currentLevel: null, nextLevel: null, progress: 0 };

  return {
    stats,
    levels,
    rank,
    loading,
    refresh,
    levelProgress,
    coins: stats?.total_coins || 0,
    level: stats?.creator_level || 'Starter',
    likesReceived: stats?.total_likes_received || 0,
    eventsCreated: stats?.total_events_created || 0,
  };
};
