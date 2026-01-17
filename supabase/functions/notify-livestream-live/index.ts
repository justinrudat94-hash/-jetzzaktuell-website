import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface LivestreamPayload {
  type: 'INSERT' | 'UPDATE';
  table: string;
  record: any;
  old_record?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload: LivestreamPayload = await req.json();
    const livestream = payload.record;

    if (livestream.status !== 'live') {
      return new Response(
        JSON.stringify({ message: 'Livestream is not live' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: event } = await supabase
      .from('events')
      .select('id, title, creator_id')
      .eq('id', livestream.event_id)
      .single();

    if (!event) {
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const affectedUsers = new Set<string>();

    const [likesResult, participantsResult, followersResult] = await Promise.all([
      supabase
        .from('likes')
        .select('user_id')
        .eq('target_type', 'event')
        .eq('target_id', event.id),
      supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', event.id),
      supabase
        .from('followers')
        .select('follower_id')
        .eq('following_id', event.creator_id)
    ]);

    if (likesResult.data) {
      likesResult.data.forEach(like => affectedUsers.add(like.user_id));
    }

    if (participantsResult.data) {
      participantsResult.data.forEach(p => affectedUsers.add(p.user_id));
    }

    if (followersResult.data) {
      followersResult.data.forEach(f => affectedUsers.add(f.follower_id));
    }

    affectedUsers.delete(event.creator_id);

    if (affectedUsers.size === 0) {
      return new Response(
        JSON.stringify({ message: 'No affected users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const notifications = Array.from(affectedUsers).map(userId => ({
      user_id: userId,
      actor_id: event.creator_id,
      notification_type: 'event_live',
      target_type: 'livestream',
      target_id: livestream.id,
      title: 'Event ist jetzt Live!',
      message: `Das Event "${event.title}" ist jetzt live`,
      data: {
        event_id: event.id,
        event_title: event.title,
        livestream_id: livestream.id
      },
      is_read: false,
      created_at: new Date().toISOString()
    }));

    const batchSize = 100;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      await supabase.from('in_app_notifications').insert(batch);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notified_users: affectedUsers.size,
        event_id: event.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});