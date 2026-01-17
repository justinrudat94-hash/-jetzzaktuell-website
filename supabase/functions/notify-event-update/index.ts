import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EventUpdatePayload {
  type: 'UPDATE';
  table: string;
  record: any;
  old_record: any;
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

    const payload: EventUpdatePayload = await req.json();
    const { record: newEvent, old_record: oldEvent } = payload;

    const changedFields: string[] = [];
    const relevantFields = ['title', 'start_date', 'end_date', 'start_time', 'end_time', 'location', 'address'];

    relevantFields.forEach(field => {
      if (newEvent[field] !== oldEvent[field]) {
        changedFields.push(field);
      }
    });

    if (changedFields.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No relevant changes' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const affectedUsers = new Set<string>();

    const [likesResult, participantsResult, followersResult] = await Promise.all([
      supabase
        .from('likes')
        .select('user_id')
        .eq('target_type', 'event')
        .eq('target_id', newEvent.id),
      supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', newEvent.id),
      supabase
        .from('followers')
        .select('follower_id')
        .eq('following_id', newEvent.creator_id)
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

    affectedUsers.delete(newEvent.creator_id);

    if (affectedUsers.size === 0) {
      return new Response(
        JSON.stringify({ message: 'No affected users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fieldLabels: Record<string, string> = {
      title: 'Titel',
      start_date: 'Startdatum',
      end_date: 'Enddatum',
      start_time: 'Startzeit',
      end_time: 'Endzeit',
      location: 'Ort',
      address: 'Adresse'
    };

    const changedFieldsText = changedFields.map(f => fieldLabels[f]).join(', ');

    const notifications = Array.from(affectedUsers).map(userId => ({
      user_id: userId,
      actor_id: newEvent.creator_id,
      notification_type: 'event_updated',
      target_type: 'event',
      target_id: newEvent.id,
      title: 'Event geändert',
      message: `Das Event "${newEvent.title}" wurde aktualisiert: ${changedFieldsText}`,
      data: {
        event_title: newEvent.title,
        changed_fields: changedFields
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
        changed_fields: changedFields
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