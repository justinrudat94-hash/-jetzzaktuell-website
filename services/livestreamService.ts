import { supabase } from '@/lib/supabase';

export interface LiveEvent {
  id: string;
  title: string;
  description: string;
  image_url: string;
  location: string;
  creator_id: string;
  is_live: boolean;
  stream_url?: string;
  stream_started_at?: string;
  viewer_count: number;
  peak_viewer_count: number;
  like_count: number;
  coins_earned: number;
}

export interface ChatMessage {
  id: string;
  event_id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
  is_streamer: boolean;
}

export const livestreamService = {
  async getLiveEvents(): Promise<LiveEvent[]> {
    const { data, error } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        image_url,
        location,
        creator_id,
        is_live,
        stream_url,
        stream_started_at,
        viewer_count,
        peak_viewer_count,
        like_count,
        coins_earned
      `)
      .eq('is_live', true)
      .order('stream_started_at', { ascending: false });

    if (error) {
      console.error('Error loading live events:', error);
      return [];
    }

    return data || [];
  },

  async startLivestream(eventId: string, streamUrl: string) {
    const { data, error } = await supabase.rpc('start_livestream', {
      p_event_id: eventId,
      p_stream_url: streamUrl,
    });

    if (error) {
      console.error('Error starting livestream:', error);
      throw error;
    }

    return data;
  },

  async stopLivestream(eventId: string) {
    const { data, error } = await supabase.rpc('stop_livestream', {
      p_event_id: eventId,
    });

    if (error) {
      console.error('Error stopping livestream:', error);
      throw error;
    }

    return data;
  },

  async updateViewerCount(eventId: string, increment: boolean = true) {
    const { error } = await supabase.rpc('update_viewer_count', {
      p_event_id: eventId,
      p_increment: increment,
    });

    if (error) {
      console.error('Error updating viewer count:', error);
    }
  },

  async sendChatMessage(eventId: string, userId: string, message: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();

    const { data, error } = await supabase
      .from('live_chat_messages')
      .insert({
        event_id: eventId,
        user_id: userId,
        message: message.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }

    return {
      ...data,
      username: profile?.username || 'Unbekannt',
    };
  },

  async getChatMessages(eventId: string, limit: number = 50): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('live_chat_messages')
      .select(`
        id,
        event_id,
        user_id,
        message,
        created_at,
        profiles!user_id (
          username
        ),
        events!event_id (
          creator_id
        )
      `)
      .eq('event_id', eventId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error loading chat messages:', error);
      return [];
    }

    return (data || []).map((msg: any) => ({
      id: msg.id,
      event_id: msg.event_id,
      user_id: msg.user_id,
      username: msg.profiles?.username || 'Unbekannt',
      message: msg.message,
      created_at: msg.created_at,
      is_streamer: msg.user_id === msg.events?.creator_id,
    }));
  },

  subscribeToChatMessages(
    eventId: string,
    callback: (message: ChatMessage) => void
  ) {
    const channel = supabase
      .channel(`chat:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `event_id=eq.${eventId}`,
        },
        async (payload) => {
          const newMessage = payload.new as any;

          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', newMessage.user_id)
            .single();

          const { data: event } = await supabase
            .from('events')
            .select('creator_id')
            .eq('id', eventId)
            .single();

          callback({
            id: newMessage.id,
            event_id: newMessage.event_id,
            user_id: newMessage.user_id,
            username: profile?.username || 'Unbekannt',
            message: newMessage.message,
            created_at: newMessage.created_at,
            is_streamer: newMessage.user_id === event?.creator_id,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async sendCoins(streamerId: string, amount: number) {
    const { data, error } = await supabase.rpc('send_coins_to_streamer', {
      p_streamer_id: streamerId,
      p_amount: amount,
    });

    if (error) {
      console.error('Error sending coins:', error);
      throw error;
    }

    return data;
  },

  async likeStream(eventId: string, userId: string) {
    const { data: existingLike } = await supabase
      .from('event_likes')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      return { alreadyLiked: true };
    }

    const { error: likeError } = await supabase
      .from('event_likes')
      .insert({
        event_id: eventId,
        user_id: userId,
      });

    if (likeError) {
      console.error('Error liking stream:', likeError);
      throw likeError;
    }

    const { error: incrementError } = await supabase.rpc('increment_like_count', {
      p_event_id: eventId,
    });

    if (incrementError) {
      console.error('Error incrementing like count:', incrementError);
    }

    return { success: true };
  },

  async getStreamStatistics(eventId: string) {
    const { data, error } = await supabase
      .from('events')
      .select('viewer_count, peak_viewer_count, like_count, coins_earned')
      .eq('id', eventId)
      .single();

    if (error) {
      console.error('Error loading stream statistics:', error);
      return null;
    }

    return data;
  },
};
