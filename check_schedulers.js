const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  // Get all schedulers
  const { data: schedulers, error } = await supabase
    .from('auto_import_schedulers')
    .select('*')
    .eq('source_type', 'ticketmaster');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== Active Ticketmaster Schedulers ===\n');
  schedulers.forEach(s => {
    console.log(`ID: ${s.id}`);
    console.log(`Name: ${s.name}`);
    console.log(`Enabled: ${s.is_enabled}`);
    console.log(`Interval: ${s.interval_hours}h`);
    console.log(`Next Run: ${s.next_run_at}`);
    console.log(`Config:`, JSON.stringify(s.config, null, 2));
    console.log('---\n');
  });

  // Get recent logs
  const { data: logs } = await supabase
    .from('auto_import_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(5);

  console.log('\n=== Recent Import Logs ===\n');
  if (logs) {
    logs.forEach(log => {
      console.log(`${log.started_at}: Found ${log.events_found}, Imported ${log.events_imported}, Skipped ${log.events_skipped}`);
    });
  }
})();
