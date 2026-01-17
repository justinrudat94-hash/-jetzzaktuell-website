const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkLogs() {
  console.log('📋 Checking Scheduler Logs...\n');

  const { data: logs } = await supabase
    .from('auto_import_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(5);

  if (!logs || logs.length === 0) {
    console.log('❌ No logs found. Cron has not executed yet.');
    return;
  }

  console.log('Found', logs.length, 'recent log entries:\n');
  logs.forEach((log, i) => {
    console.log(`Log ${i + 1}:`);
    console.log('  Started:', new Date(log.started_at).toLocaleString('de-DE'));
    console.log('  Finished:', log.finished_at ? new Date(log.finished_at).toLocaleString('de-DE') : 'Running...');
    console.log('  Status:', log.status);
    console.log('  Found:', log.events_found || 0);
    console.log('  Imported:', log.events_imported || 0);
    console.log('  Skipped:', log.events_skipped || 0);
    if (log.error_message) {
      console.log('  Error:', log.error_message);
    }
    console.log('');
  });

  // Check scheduler status
  const { data: schedulers } = await supabase
    .from('auto_import_schedulers')
    .select('name, is_enabled, last_run_at, next_run_at')
    .eq('is_enabled', true);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Active Schedulers:\n');
  schedulers?.forEach((s) => {
    console.log('📅', s.name);
    console.log('   Last Run:', s.last_run_at ? new Date(s.last_run_at).toLocaleString('de-DE') : 'Never');
    console.log('   Next Run:', new Date(s.next_run_at).toLocaleString('de-DE'));
    console.log('');
  });
}

checkLogs()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
