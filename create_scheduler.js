const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  console.log('Creating Ticketmaster Auto-Import Scheduler...\n');

  // Check if scheduler already exists
  const { data: existing } = await supabase
    .from('auto_import_schedulers')
    .select('*')
    .eq('source_type', 'ticketmaster')
    .maybeSingle();

  if (existing) {
    console.log('Scheduler already exists!');
    console.log('ID:', existing.id);
    console.log('Name:', existing.name);
    console.log('Enabled:', existing.is_enabled);
    console.log('\nUpdating config to start city rotation...');

    const { error: updateError } = await supabase
      .from('auto_import_schedulers')
      .update({
        is_enabled: true,
        config: {
          countryCode: 'DE',
          radius: '50',
          size: 50,
          currentCategoryIndex: 0,
          currentCityIndex: 0,
          currentPage: 0,
        }
      })
      .eq('id', existing.id);

    if (updateError) {
      console.error('Error updating scheduler:', updateError);
    } else {
      console.log('✅ Scheduler updated successfully!');
      console.log('Will start rotating through German cities and categories');
    }
    return;
  }

  // Create new scheduler
  const { data, error } = await supabase
    .from('auto_import_schedulers')
    .insert({
      name: 'Ticketmaster Germany Auto-Import',
      source_type: 'ticketmaster',
      is_enabled: true,
      interval_minutes: 60,
      next_run_at: new Date().toISOString(),
      config: {
        countryCode: 'DE',
        radius: '50',
        size: 50,
        currentCategoryIndex: 0,
        currentCityIndex: 0,
        currentPage: 0,
      }
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating scheduler:', error);
  } else {
    console.log('✅ Scheduler created successfully!');
    console.log('ID:', data.id);
    console.log('Name:', data.name);
    console.log('Interval: Every', data.interval_minutes, 'minutes');
    console.log('Next Run:', data.next_run_at);
    console.log('\nThe scheduler will now:');
    console.log('1. Rotate through 15 German cities');
    console.log('2. Search 25+ categories per city');
    console.log('3. Import new events every hour');
  }
})();
