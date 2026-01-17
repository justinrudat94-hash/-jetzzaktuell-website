#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

console.log('🔄 Final sync of scraped_events → events\n');

let totalSynced = 0;

async function sync() {
  while (true) {
    const { data: pending } = await supabase
      .from('scraped_events')
      .select('id, external_id')
      .eq('status', 'pending')
      .is('event_id', null)
      .limit(50);

    if (!pending || pending.length === 0) {
      console.log('\n✅ Sync complete!', totalSynced, 'events linked');
      break;
    }

    for (const s of pending) {
      const { data: e } = await supabase
        .from('events')
        .select('id')
        .eq('external_event_id', s.external_id)
        .maybeSingle();

      if (e) {
        await supabase
          .from('scraped_events')
          .update({
            event_id: e.id,
            status: 'approved',
            reviewed_at: new Date().toISOString()
          })
          .eq('id', s.id);

        totalSynced++;
        if (totalSynced % 100 === 0) {
          console.log(`  Synced: ${totalSynced}...`);
        }
      }
    }
  }
}

sync()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
