const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  // Check how many events have external_id from Ticketmaster
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, external_id, external_source')
    .or('external_source.eq.ticketmaster,external_id.like.%ticketmaster%');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Events from Ticketmaster in events table:', events.length);
    if (events.length > 0) {
      console.log('Sample:', events.slice(0, 3).map(e => ({
        title: e.title,
        external_id: e.external_id,
        source: e.external_source
      })));
    }
  }

  // Check scraped events that should be published
  const { data: sources } = await supabase
    .from('event_sources')
    .select('id')
    .eq('source_type', 'ticketmaster');

  if (sources && sources.length > 0) {
    const { data: scraped } = await supabase
      .from('scraped_events')
      .select('id, title, status, external_id')
      .in('source_id', sources.map(s => s.id))
      .eq('status', 'approved')
      .limit(5);

    console.log('\nSample approved scraped events:');
    scraped.forEach(s => {
      console.log(`- ${s.title} (external_id: ${s.external_id})`);
    });
  }
})();
