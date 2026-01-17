const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  const { data: sources } = await supabase
    .from('event_sources')
    .select('id')
    .eq('source_type', 'ticketmaster');

  if (!sources || sources.length === 0) {
    console.log('No Ticketmaster sources found');
    return;
  }

  const sourceIds = sources.map(s => s.id);

  const { data, error } = await supabase
    .from('scraped_events')
    .select('status, created_at')
    .in('source_id', sourceIds);

  if (error) {
    console.error('Error:', error);
  } else {
    const stats = {};
    data.forEach(row => {
      if (!stats[row.status]) stats[row.status] = 0;
      stats[row.status]++;
    });
    console.log('Total scraped events:', data.length);
    console.log('By status:', stats);
    if (data.length > 0) {
      const sorted = data.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
      console.log('Newest:', sorted[0].created_at);
      console.log('Oldest:', sorted[sorted.length-1].created_at);
    }
  }
})();
