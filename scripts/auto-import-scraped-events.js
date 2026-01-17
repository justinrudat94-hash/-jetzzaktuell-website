const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function autoImportScrapedEvents() {
  console.log('🚀 Starting auto-import of scraped events...\n');

  let totalImported = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  let batchNumber = 1;

  while (true) {
    console.log(`\n📦 Batch ${batchNumber}...`);

    const { data: pending, error } = await supabase
      .from('scraped_events')
      .select('*')
      .eq('status', 'pending')
      .is('event_id', null)
      .order('created_at', { ascending: true })
      .limit(500);

    if (error) {
      console.error('❌ Error fetching pending events:', error);
      break;
    }

    if (!pending || pending.length === 0) {
      console.log('✅ No more pending events to import');
      break;
    }

    console.log(`📥 Found ${pending.length} pending events in this batch\n`);

    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (const scraped of pending) {
    try {
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('external_event_id', scraped.external_id)
        .maybeSingle();

      if (existing) {
        skipped++;
        await supabase
          .from('scraped_events')
          .update({ event_id: existing.id, status: 'approved', reviewed_at: new Date().toISOString() })
          .eq('id', scraped.id);
        continue;
      }

      const startDate = scraped.start_date?.split('T')[0];
      const startTime = scraped.start_date?.split('T')[1]?.substring(0, 5) || '20:00';
      const endDate = scraped.end_date?.split('T')[0] || null;
      const endTime = scraped.end_date?.split('T')[1]?.substring(0, 5) || null;

      const { data: inserted, error: insertError } = await supabase
        .from('events')
        .insert({
          user_id: null,
          title: scraped.title,
          description: scraped.description,
          category: scraped.category,
          location: scraped.location,
          city: scraped.location?.split(',')[1]?.trim() || null,
          latitude: scraped.latitude,
          longitude: scraped.longitude,
          start_date: startDate,
          start_time: startTime,
          end_date: endDate,
          end_time: endTime,
          preview_image_url: scraped.image_url,
          ticket_url: scraped.ticket_url || scraped.external_url,
          external_url: scraped.external_url,
          external_event_id: scraped.external_id,
          external_source: 'ticketmaster',
          is_published: true,
          is_free: false,
          is_auto_imported: true,
        })
        .select('id')
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          skipped++;
        } else {
          console.error(`❌ Insert error for "${scraped.title}":`, insertError.message);
          failed++;
        }
        continue;
      }

      await supabase
        .from('scraped_events')
        .update({
          event_id: inserted.id,
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', scraped.id);

      imported++;

      if (imported % 100 === 0) {
        console.log(`   Progress: ${imported} imported, ${skipped} skipped, ${failed} failed`);
      }
    } catch (err) {
      console.error(`❌ Error processing event "${scraped.title}":`, err.message);
      failed++;
    }
    }

    totalImported += imported;
    totalSkipped += skipped;
    totalFailed += failed;

    console.log(`\n   Batch ${batchNumber} results: ${imported} imported, ${skipped} skipped, ${failed} failed`);
    batchNumber++;

    if (pending.length < 500) {
      break;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ AUTO-IMPORT COMPLETED!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   📊 Total Imported: ${totalImported}`);
  console.log(`   ⏭️  Total Skipped: ${totalSkipped}`);
  console.log(`   ❌ Total Failed: ${totalFailed}`);
  console.log(`   📈 Total Processed: ${totalImported + totalSkipped + totalFailed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

autoImportScrapedEvents()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
