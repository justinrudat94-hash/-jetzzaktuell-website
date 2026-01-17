#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

function mapCategory(segment, genre) {
  const seg = segment?.toLowerCase() || '';
  const gen = genre?.toLowerCase() || '';

  if (seg.includes('music') || gen.includes('music')) return 'music';
  if (seg.includes('sports') || gen.includes('sport')) return 'sports';
  if (seg.includes('arts') || seg.includes('theatre')) return 'art';
  if (gen.includes('comedy')) return 'nightlife';
  if (seg.includes('film')) return 'other';

  return 'other';
}

async function importTicketmasterEvents() {
  console.log('🎫 Starting Ticketmaster Import...\n');

  let totalImported = 0;
  let totalSkipped = 0;
  let page = 0;
  const size = 200;

  try {
    while (page < 5) {
      console.log(`\n📄 Fetching page ${page + 1}...`);

      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TICKETMASTER_API_KEY}&countryCode=DE&size=${size}&page=${page}&sort=date,asc`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`❌ API Error: ${response.status} ${response.statusText}`);
        break;
      }

      const data = await response.json();
      const events = data._embedded?.events || [];

      if (events.length === 0) {
        console.log('✅ No more events found');
        break;
      }

      console.log(`   Found ${events.length} events`);

      for (const event of events) {
        try {
          // Check if exists
          const { data: existing } = await supabase
            .from('events')
            .select('id')
            .eq('external_id', event.id)
            .maybeSingle();

          if (existing) {
            totalSkipped++;
            continue;
          }

          // Get venue info
          const venue = event._embedded?.venues?.[0];
          const location = venue?.name || '';
          const city = venue?.city?.name || '';
          const country = venue?.country?.name || '';
          const fullLocation = [location, city, country].filter(Boolean).join(', ');

          const latitude = venue?.location?.latitude ? parseFloat(venue.location.latitude) : null;
          const longitude = venue?.location?.longitude ? parseFloat(venue.location.longitude) : null;

          // Parse dates
          const startDateTime = event.dates?.start?.dateTime || event.dates?.start?.localDate;
          if (!startDateTime) {
            console.log(`   ⏭️  Skipping ${event.name} (no date)`);
            totalSkipped++;
            continue;
          }

          const startDate = startDateTime.split('T')[0];
          const startTime = startDateTime.includes('T')
            ? startDateTime.split('T')[1].substring(0, 5)
            : '20:00';

          // Category
          const segment = event.classifications?.[0]?.segment?.name;
          const genre = event.classifications?.[0]?.genre?.name;
          const category = mapCategory(segment, genre);

          // Image
          const images = event.images || [];
          const image = images.find(img => img.ratio === '16_9' && img.width > 1000)
            || images.find(img => img.width > 800)
            || images[0];

          // Description
          const description = event.info || event.pleaseNote || `${event.name} - ${segment || 'Event'} from Ticketmaster`;

          // Insert
          const { error } = await supabase
            .from('events')
            .insert({
              user_id: SYSTEM_USER_ID,
              title: event.name,
              description,
              category,
              location: fullLocation,
              latitude,
              longitude,
              start_date: startDate,
              start_time: startTime,
              end_date: null,
              end_time: null,
              image_url: image?.url || null,
              preview_image_url: image?.url || null,
              is_published: true,
              is_free: false,
              ticket_url: event.url,
              external_url: event.url,
              external_id: event.id,
              external_source: 'ticketmaster',
            });

          if (error) {
            if (error.code === '23505') {
              totalSkipped++;
            } else {
              console.error(`   ❌ Error: ${error.message}`);
            }
          } else {
            totalImported++;
            if (totalImported % 10 === 0) {
              console.log(`   ✅ Imported ${totalImported} events...`);
            }
          }
        } catch (error) {
          console.error(`   ❌ Error processing event:`, error.message);
        }
      }

      page++;

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Import completed!`);
    console.log(`   Imported: ${totalImported}`);
    console.log(`   Skipped: ${totalSkipped}`);
    console.log('='.repeat(60));

    const { count: total } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('external_source', 'ticketmaster');

    console.log(`\n📊 Total Ticketmaster events in database: ${total}\n`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

importTicketmasterEvents();
