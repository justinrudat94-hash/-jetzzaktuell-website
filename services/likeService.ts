import { supabase } from '@/lib/supabase';

export interface Like {
  id: string;
  user_id: string;
  target_type: 'event' | 'user' | 'livestream';
  target_id: string;
  created_at: string;
}

export const likeTarget = async (
  targetType: 'event' | 'user' | 'livestream',
  targetId: string
): Promise<{ error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: 'Not authenticated' } };
    }

    const { error } = await supabase
      .from('likes')
      .insert({
        user_id: user.id,
        target_type: targetType,
        target_id: targetId,
      });

    return { error };
  } catch (error) {
    console.error('Error liking target:', error);
    return { error };
  }
};

export const unlikeTarget = async (
  targetType: 'event' | 'user' | 'livestream',
  targetId: string
): Promise<{ error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: 'Not authenticated' } };
    }

    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId);

    return { error };
  } catch (error) {
    console.error('Error unliking target:', error);
    return { error };
  }
};

export const isLiked = async (
  targetType: 'event' | 'user' | 'livestream',
  targetId: string
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .maybeSingle();

    if (error) {
      console.error('Error checking like status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking like status:', error);
    return false;
  }
};

export const getLikeCount = async (
  targetType: 'event' | 'user' | 'livestream',
  targetId: string
): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('likes')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', targetType)
      .eq('target_id', targetId);

    if (error) {
      console.error('Error getting like count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting like count:', error);
    return 0;
  }
};

export const getUserLikes = async (
  userId: string,
  targetType?: 'event' | 'user' | 'livestream',
  limit: number = 50
): Promise<Like[]> => {
  try {
    let query = supabase
      .from('likes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (targetType) {
      query = query.eq('target_type', targetType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting user likes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting user likes:', error);
    return [];
  }
};

export const getTargetLikes = async (
  targetType: 'event' | 'user' | 'livestream',
  targetId: string,
  limit: number = 50
): Promise<Like[]> => {
  try {
    const { data, error } = await supabase
      .from('likes')
      .select(`
        *,
        profiles!likes_user_id_fkey (
          id,
          name,
          city,
          avatar_url
        )
      `)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting target likes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting target likes:', error);
    return [];
  }
};

export const getMostLikedEvents = async (limit: number = 10): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('likes')
      .select(`
        target_id,
        count:id
      `)
      .eq('target_type', 'event')
      .order('count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting most liked events:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting most liked events:', error);
    return [];
  }
};

export const toggleLike = async (
  targetType: 'event' | 'user' | 'livestream',
  targetId: string
): Promise<{ liked: boolean; error: any }> => {
  try {
    const liked = await isLiked(targetType, targetId);

    if (liked) {
      const { error } = await unlikeTarget(targetType, targetId);
      return { liked: false, error };
    } else {
      const { error } = await likeTarget(targetType, targetId);
      return { liked: true, error };
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    return { liked: false, error };
  }
};

export const getLikeStats = async (
  targetType: 'event' | 'user' | 'livestream',
  targetId: string
): Promise<{
  count: number;
  isLiked: boolean;
  recentLikers: any[];
}> => {
  try {
    const [count, isLikedStatus, recentLikes] = await Promise.all([
      getLikeCount(targetType, targetId),
      isLiked(targetType, targetId),
      getTargetLikes(targetType, targetId, 5),
    ]);

    return {
      count,
      isLiked: isLikedStatus,
      recentLikers: recentLikes,
    };
  } catch (error) {
    console.error('Error getting like stats:', error);
    return {
      count: 0,
      isLiked: false,
      recentLikers: [],
    };
  }
};
