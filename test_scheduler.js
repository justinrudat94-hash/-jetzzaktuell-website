const { schedulerService } = require('./services/schedulerService');

(async () => {
  console.log('Testing scheduler execution...\n');

  try {
    const schedulerId = 'fc9b52ed-2344-4d1c-a6fb-68e5ae1f46f3';

    console.log('Executing scheduler:', schedulerId);
    const log = await schedulerService.executeScheduler(schedulerId);

    console.log('\n=== Execution Result ===');
    console.log('Status:', log.status);
    console.log('Events Found:', log.events_found);
    console.log('Events Imported:', log.events_imported);
    console.log('Events Skipped:', log.events_skipped);
    console.log('Events Failed:', log.events_failed);
    console.log('Duration:', log.finished_at ?
      `${Math.round((new Date(log.finished_at) - new Date(log.started_at)) / 1000)}s` :
      'Still running...'
    );

    if (log.error_message) {
      console.log('\nError:', log.error_message);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
