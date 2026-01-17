import { supabase } from '@/lib/supabase';
import { aiModerationService } from './aiModerationService';

export interface Comment {
  id: string;
  event_id: string;
  user_id: string;
  parent_comment_id?: string;
  content: string;
  is_flagged: boolean;
  is_hidden: boolean;
  hidden_reason?: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  replies?: Comment[];
  user_has_liked?: boolean;
}

export async function createComment(
  eventId: string,
  content: string,
  parentCommentId?: string
): Promise<{ success: boolean; error?: string; comment?: Comment }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Nicht angemeldet' };
    }

    // First, insert comment with temp ID
    const tempId = `temp-${Date.now()}`;

    // Create comment first
    const { data, error } = await supabase
      .from('comments')
      .insert({
        event_id: eventId,
        user_id: user.id,
        parent_comment_id: parentCommentId || null,
        content,
        is_flagged: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return { success: false, error: 'Fehler beim Erstellen des Kommentars' };
    }

    // Run AI moderation after comment is created
    const moderationResult = await aiModerationService.moderateComment(
      data.id,
      user.id,
      content,
      eventId,
      parentCommentId
    );

    // Check if comment should be blocked/deleted
    if (moderationResult && !moderationResult.moderation.allowed) {
      // Delete the comment immediately
      await supabase.from('comments').delete().eq('id', data.id);

      const violations = moderationResult.moderation.violations
        .map(v => {
          const type = v.split(':')[0];
          return aiModerationService.getViolationTypeLabel(type);
        })
        .join(', ');

      return {
        success: false,
        error: `Kommentar wurde blockiert: ${violations || 'Verstoß gegen Community-Richtlinien'}`,
      };
    }

    return { success: true, comment: data };
  } catch (error) {
    console.error('Error creating comment:', error);
    return { success: false, error: 'Unerwarteter Fehler' };
  }
}

export async function getEventComments(eventId: string): Promise<Comment[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:profiles!comments_user_id_fkey(id, username, avatar_url)
      `)
      .eq('event_id', eventId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      return [];
    }

    const commentsWithLikes = await Promise.all(
      (data || []).map(async (comment) => {
        const replies = await getCommentReplies(comment.id);

        let userHasLiked = false;
        if (userId) {
          const { data: likeData } = await supabase
            .from('comment_likes')
            .select('id')
            .eq('comment_id', comment.id)
            .eq('user_id', userId)
            .maybeSingle();

          userHasLiked = !!likeData;
        }

        return {
          ...comment,
          replies,
          user_has_liked: userHasLiked,
        };
      })
    );

    return commentsWithLikes;
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

async function getCommentReplies(parentId: string): Promise<Comment[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:profiles!comments_user_id_fkey(id, username, avatar_url)
      `)
      .eq('parent_comment_id', parentId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    const repliesWithLikes = await Promise.all(
      data.map(async (reply) => {
        let userHasLiked = false;
        if (userId) {
          const { data: likeData } = await supabase
            .from('comment_likes')
            .select('id')
            .eq('comment_id', reply.id)
            .eq('user_id', userId)
            .maybeSingle();

          userHasLiked = !!likeData;
        }

        return {
          ...reply,
          user_has_liked: userHasLiked,
        };
      })
    );

    return repliesWithLikes;
  } catch (error) {
    console.error('Error fetching replies:', error);
    return [];
  }
}

export async function likeComment(commentId: string): Promise<{ success: boolean }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false };
    }

    const { error } = await supabase.from('comment_likes').insert({
      comment_id: commentId,
      user_id: user.id,
    });

    if (error) {
      console.error('Error liking comment:', error);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('Error liking comment:', error);
    return { success: false };
  }
}

export async function unlikeComment(commentId: string): Promise<{ success: boolean }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false };
    }

    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error unliking comment:', error);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('Error unliking comment:', error);
    return { success: false };
  }
}

export async function deleteComment(commentId: string): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting comment:', error);
    return { success: false };
  }
}

export async function hideComment(
  commentId: string,
  reason: string
): Promise<{ success: boolean }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false };
    }

    const { error } = await supabase
      .from('comments')
      .update({
        is_hidden: true,
        hidden_reason: reason,
        hidden_by: user.id,
        hidden_at: new Date().toISOString(),
      })
      .eq('id', commentId);

    if (error) {
      console.error('Error hiding comment:', error);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('Error hiding comment:', error);
    return { success: false };
  }
}
