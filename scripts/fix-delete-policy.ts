import { supabase } from '../lib/supabase';

async function fixDeletePolicy() {
  console.log('Fixing delete policy...');

  // Drop existing policy
  const dropSql = 'DROP POLICY IF EXISTS "Users can delete own events" ON events';

  let result = await supabase.rpc('exec_sql', { sql: dropSql });
  if (result.error) {
    console.error('Error dropping policy:', result.error);
  }

  // Create new policy
  const createSql = `
    CREATE POLICY "Users can delete own events"
      ON events FOR DELETE
      TO anon, authenticated
      USING (true)
  `;

  result = await supabase.rpc('exec_sql', { sql: createSql });
  if (result.error) {
    console.error('Error creating policy:', result.error);
  } else {
    console.log('Delete policy fixed successfully!');
  }
}

fixDeletePolicy();
