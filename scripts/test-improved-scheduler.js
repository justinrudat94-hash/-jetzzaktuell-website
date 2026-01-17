const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testImprovedScheduler() {
  console.log('🚀 Testing Improved Multi-Page Scheduler...\n');

  // Get Deutschland scheduler
  const { data: scheduler } = await supabase
    .from('auto_import_schedulers')
    .select('*')
    .eq('name', 'Deutschland Ticketmaster Auto-Import')
    .maybeSingle();

  if (!scheduler) {
    console.log('❌ Deutschland scheduler not found');
    return;
  }

  console.log('📋 Scheduler:', scheduler.name);
  console.log('📊 Current config:', JSON.stringify(scheduler.config, null, 2));
  console.log('');

  // Reset to page 0 for fresh test
  await supabase
    .from('auto_import_schedulers')
    .update({
      config: {
        ...scheduler.config,
        currentPage: 0,
        consecutiveDuplicatePages: 0,
      },
    })
    .eq('id', scheduler.id);

  console.log('🔄 Reset to page 0');
  console.log('');
  console.log('⏳ Calling Edge Function (this will take ~1 minute)...');
  console.log('');

  const startTime = Date.now();

  // Call Edge Function manually
  const response = await fetch(
    process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/run-scheduled-import',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ schedulerId: scheduler.id }),
    }
  );

  const result = await response.json();
  const duration = Math.round((Date.now() - startTime) / 1000);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ERGEBNIS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Status:', response.ok ? '✅ Erfolg' : '❌ Fehler');
  console.log('Dauer:', duration + 's');
  console.log('');
  console.log('Events gefunden:', result.found || 0);
  console.log('Events importiert:', result.imported || 0);
  console.log('Events übersprungen:', result.skipped || 0);
  console.log('Pages verarbeitet:', result.pagesProcessed || 0);
  console.log('Nächste Page:', result.nextPage || 0);
  console.log('');

  if (result.error) {
    console.log('❌ Error:', result.error);
  }

  // Calculate stats
  if (result.found > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 HOCHRECHNUNG:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Pro Stunde:', result.found, 'Events');
    console.log('Pro Tag:', result.found * 24, 'Events');
    console.log('');
    console.log('Für 115.189 Events:');
    console.log('Tage benötigt:', Math.ceil(115189 / (result.found * 24)));
    console.log('Stunden benötigt:', Math.ceil(115189 / result.found));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

testImprovedScheduler()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
