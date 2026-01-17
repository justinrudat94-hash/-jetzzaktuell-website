const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function storeConfig() {
  console.log('💾 Storing Supabase config for scheduler...\n');

  // Store URL
  const { error: urlError } = await supabase
    .from('api_keys')
    .upsert(
      {
        service: 'supabase_url',
        api_key: process.env.EXPO_PUBLIC_SUPABASE_URL,
      },
      { onConflict: 'service' }
    );

  if (urlError) {
    console.error('❌ Error storing URL:', urlError.message);
  } else {
    console.log('✅ Supabase URL stored');
  }

  // Store Key
  const { error: keyError } = await supabase
    .from('api_keys')
    .upsert(
      {
        service: 'supabase_anon_key',
        api_key: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      },
      { onConflict: 'service' }
    );

  if (keyError) {
    console.error('❌ Error storing key:', keyError.message);
  } else {
    console.log('✅ Supabase Anon Key stored');
  }

  if (!urlError && !keyError) {
    console.log('\n✅ Configuration stored successfully!');
    console.log('The scheduler will now be able to call Edge Functions.');
  }
}

storeConfig()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
