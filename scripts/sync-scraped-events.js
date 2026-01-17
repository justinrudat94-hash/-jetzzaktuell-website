const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function syncScrapedEvents() {
  console.log('🔄 Syncing scraped_events with events table...\n');

  let totalSynced = 0;
  let batchNumber = 1;

  while (true) {
    console.log(`\n📦 Batch ${batchNumber}...`);

    // 1. Get scraped events with status=pending and no event_id
    const { data: pending } = await supabase
      .from('scraped_events')
      .select('id, external_id')
      .eq('status', 'pending')
      .is('event_id', null)
      .limit(1000);

    if (!pending || pending.length === 0) {
      console.log('✅ No more pending events to sync');
      break;
    }

    console.log(`   Found ${pending.length} pending events`);

    // 2. Get corresponding events from events table in smaller batches (Supabase limit)
    const externalIds = pending.map(p => p.external_id);
    const eventMap = new Map();

    // Process in chunks of 100
    for (let i = 0; i < externalIds.length; i += 100) {
      const chunk = externalIds.slice(i, i + 100);

      const { data: events } = await supabase
        .from('events')
        .select('id, external_event_id')
        .in('external_event_id', chunk);

      if (events) {
        events.forEach(e => eventMap.set(e.external_event_id, e.id));
      }
    }

    if (eventMap.size === 0) {
      console.log('   No matching events found');
      break;
    }

    console.log(`   Found ${eventMap.size} matching events in events table`);

    // 4. Update scraped_events in batches
    let synced = 0;
    for (const scraped of pending) {
      const eventId = eventMap.get(scraped.external_id);
      if (eventId) {
        await supabase
          .from('scraped_events')
          .update({
            event_id: eventId,
            status: 'approved',
            reviewed_at: new Date().toISOString()
          })
          .eq('id', scraped.id);

        synced++;
      }
    }

    totalSynced += synced;
    console.log(`   ✅ Synced ${synced} events`);
    console.log(`   📈 Total synced: ${totalSynced}`);

    batchNumber++;

    if (pending.length < 1000) {
      break;
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ SYNC COMPLETED!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   📊 Total Synced: ${totalSynced}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

syncScrapedEvents()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
