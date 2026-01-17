const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function bulkImportScrapedEvents() {
  console.log('🚀 Starting BULK import of scraped events...\n');

  let totalImported = 0;
  let totalSkipped = 0;
  let batchNumber = 1;

  while (true) {
    console.log(`\n📦 Processing Batch ${batchNumber}...`);

    // 1. Fetch pending events
    const { data: pending, error: fetchError } = await supabase
      .from('scraped_events')
      .select('*')
      .eq('status', 'pending')
      .is('event_id', null)
      .order('created_at', { ascending: true })
      .limit(1000);

    if (fetchError) {
      console.error('❌ Error fetching:', fetchError);
      break;
    }

    if (!pending || pending.length === 0) {
      console.log('✅ No more pending events');
      break;
    }

    console.log(`   Found ${pending.length} pending events`);

    // 2. Get existing external_ids to skip duplicates
    const externalIds = pending.map(e => e.external_id).filter(Boolean);

    const { data: existingEvents } = await supabase
      .from('events')
      .select('external_event_id')
      .in('external_event_id', externalIds);

    const existingSet = new Set(existingEvents?.map(e => e.external_event_id) || []);
    console.log(`   Found ${existingSet.size} already imported`);

    // 3. Filter out existing events
    const toImport = pending.filter(e => !existingSet.has(e.external_id));
    const skipped = pending.length - toImport.length;

    console.log(`   Will import ${toImport.length} new events`);

    if (toImport.length > 0) {
      // 4. Prepare batch insert
      const eventsToInsert = toImport.map(scraped => {
        const startDate = scraped.start_date?.split('T')[0];
        const startTime = scraped.start_date?.split('T')[1]?.substring(0, 5) || '20:00';
        const endDate = scraped.end_date?.split('T')[0] || null;
        const endTime = scraped.end_date?.split('T')[1]?.substring(0, 5) || null;

        return {
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
        };
      });

      // 5. BULK INSERT
      const { data: inserted, error: insertError } = await supabase
        .from('events')
        .insert(eventsToInsert)
        .select('id, external_event_id');

      if (insertError) {
        console.error('❌ Bulk insert error:', insertError.message);
        // Continue to next batch
      } else {
        console.log(`   ✅ Inserted ${inserted?.length || 0} events`);

        // 6. Update scraped_events status
        const insertedMap = new Map(inserted?.map(e => [e.external_event_id, e.id]) || []);

        for (const scraped of toImport) {
          const eventId = insertedMap.get(scraped.external_id);
          if (eventId) {
            await supabase
              .from('scraped_events')
              .update({
                event_id: eventId,
                status: 'approved',
                reviewed_at: new Date().toISOString()
              })
              .eq('id', scraped.id);
          }
        }

        totalImported += inserted?.length || 0;
      }
    }

    // 7. Mark skipped ones as approved (already exist)
    if (skipped > 0) {
      const skippedIds = pending
        .filter(e => existingSet.has(e.external_id))
        .map(e => e.id);

      if (skippedIds.length > 0) {
        await supabase
          .from('scraped_events')
          .update({ status: 'approved', reviewed_at: new Date().toISOString() })
          .in('id', skippedIds);
      }
    }

    totalSkipped += skipped;
    batchNumber++;

    console.log(`   📊 Batch complete: ${toImport.length} imported, ${skipped} skipped`);
    console.log(`   📈 Total so far: ${totalImported} imported, ${totalSkipped} skipped\n`);

    if (pending.length < 1000) {
      break;
    }

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ BULK IMPORT COMPLETED!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   📊 Total Imported: ${totalImported}`);
  console.log(`   ⏭️  Total Skipped: ${totalSkipped}`);
  console.log(`   📈 Total Processed: ${totalImported + totalSkipped}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

bulkImportScrapedEvents()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
