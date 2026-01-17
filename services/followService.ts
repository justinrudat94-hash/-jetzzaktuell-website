import { supabase } from '@/lib/supabase';

export interface FollowUser {
  id: string;
  name: string;
  email: string;
  city: string;
  avatar_url?: string;
  birth_year: number;
}

export const followUser = async (followingId: string): Promise<{ error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: 'Not authenticated' } };
    }

    const { error } = await supabase
      .from('followers')
      .insert({
        follower_id: user.id,
        following_id: followingId,
      });

    return { error };
  } catch (error) {
    console.error('Error following user:', error);
    return { error };
  }
};

export const unfollowUser = async (followingId: string): Promise<{ error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: 'Not authenticated' } };
    }

    const { error } = await supabase
      .from('followers')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', followingId);

    return { error };
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return { error };
  }
};

export const isFollowing = async (followingId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', followingId)
      .maybeSingle();

    if (error) {
      console.error('Error checking follow status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
};

export const getFollowers = async (userId: string): Promise<{ users: FollowUser[], count: number }> => {
  try {
    const { data, error } = await supabase
      .from('followers')
      .select(`
        follower_id,
        profiles!followers_follower_id_fkey (
          id,
          name,
          email,
          city,
          avatar_url,
          birth_year
        )
      `)
      .eq('following_id', userId);

    if (error) {
      console.error('Error getting followers:', error);
      return { users: [], count: 0 };
    }

    const users = data
      .map((item: any) => item.profiles)
      .filter((profile: any) => profile !== null);

    return { users, count: users.length };
  } catch (error) {
    console.error('Error getting followers:', error);
    return { users: [], count: 0 };
  }
};

export const getFollowing = async (userId: string): Promise<{ users: FollowUser[], count: number }> => {
  try {
    const { data, error } = await supabase
      .from('followers')
      .select(`
        following_id,
        profiles!followers_following_id_fkey (
          id,
          name,
          email,
          city,
          avatar_url,
          birth_year
        )
      `)
      .eq('follower_id', userId);

    if (error) {
      console.error('Error getting following:', error);
      return { users: [], count: 0 };
    }

    const users = data
      .map((item: any) => item.profiles)
      .filter((profile: any) => profile !== null);

    return { users, count: users.length };
  } catch (error) {
    console.error('Error getting following:', error);
    return { users: [], count: 0 };
  }
};

export const getFollowerCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('followers')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId);

    if (error) {
      console.error('Error getting follower count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting follower count:', error);
    return 0;
  }
};

export const getFollowingCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('followers')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId);

    if (error) {
      console.error('Error getting following count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting following count:', error);
    return 0;
  }
};

export const getMutualFollowers = async (userId: string): Promise<FollowUser[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('followers')
      .select(`
        following_id,
        profiles!followers_following_id_fkey (
          id,
          name,
          email,
          city,
          avatar_url,
          birth_year
        )
      `)
      .eq('follower_id', user.id)
      .in('following_id',
        supabase
          .from('followers')
          .select('follower_id')
          .eq('following_id', user.id)
      );

    if (error) {
      console.error('Error getting mutual followers:', error);
      return [];
    }

    return data
      .map((item: any) => item.profiles)
      .filter((profile: any) => profile !== null);
  } catch (error) {
    console.error('Error getting mutual followers:', error);
    return [];
  }
};
