const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function fastSync() {
  console.log('🚀 Fast syncing scraped_events...\n');

  let totalUpdated = 0;
  let batchNum = 1;

  while (true) {
    console.log(`📦 Batch ${batchNum}...`);

    // Get pending scraped events
    const { data: pending } = await supabase
      .from('scraped_events')
      .select('id, external_id')
      .eq('status', 'pending')
      .is('event_id', null)
      .limit(200);

    if (!pending || pending.length === 0) {
      console.log('✅ No more pending events\n');
      break;
    }

    console.log(`   Processing ${pending.length} events...`);

    // Get external IDs
    const externalIds = pending.map(p => p.external_id);

    // Fetch matching events in chunks
    const eventMap = new Map();

    for (let i = 0; i < externalIds.length; i += 50) {
      const chunk = externalIds.slice(i, i + 50);

      const { data: events } = await supabase
        .from('events')
        .select('id, external_event_id')
        .in('external_event_id', chunk);

      if (events) {
        events.forEach(e => eventMap.set(e.external_event_id, e.id));
      }
    }

    console.log(`   Found ${eventMap.size} matches`);

    // Prepare batch updates
    const updates = [];
    for (const scraped of pending) {
      const eventId = eventMap.get(scraped.external_id);
      if (eventId) {
        updates.push({
          id: scraped.id,
          event_id: eventId,
          status: 'approved',
          reviewed_at: new Date().toISOString()
        });
      }
    }

    // Upsert in one go
    if (updates.length > 0) {
      const { error } = await supabase
        .from('scraped_events')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        console.error('   ❌ Upsert error:', error.message);
      } else {
        totalUpdated += updates.length;
        console.log(`   ✅ Updated ${updates.length} events`);
      }
    }

    console.log(`   📈 Total: ${totalUpdated}\n`);
    batchNum++;

    if (pending.length < 200) break;

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ SYNC COMPLETED!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Total Updated: ${totalUpdated}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

fastSync()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
