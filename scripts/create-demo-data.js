const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createDemoData() {
  try {
    console.log('🚀 Erstelle Demo Live Events und Streams...\n');

    // Hole den ersten User
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError || !users || users.length === 0) {
      console.error('❌ Fehler: Keine User gefunden. Bitte registriere dich zuerst!');
      return;
    }

    const userId = users[0].id;
    console.log('✅ User gefunden:', userId);

    // Demo Events Daten
    const demoEvents = [
      {
        title: 'Live Festival Berlin',
        description: 'Gerade live! Erlebe das Festival hautnah mit uns! Die besten DJs der Stadt spielen für euch!',
        location: 'Festival Arena Berlin',
        latitude: 52.5200,
        longitude: 13.4050,
        date_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        category: 'Musik',
        image_url: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg',
        is_published: true,
        allow_livestream: true,
        user_id: userId,
        creator_id: userId
      },
      {
        title: 'Live DJ Set am Strand',
        description: 'Chillige Sunset Vibes direkt vom Strand! Join us für entspannte Beats!',
        location: 'Beach Club Hamburg',
        latitude: 53.5511,
        longitude: 9.9937,
        date_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        category: 'Musik',
        image_url: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg',
        is_published: true,
        allow_livestream: true,
        user_id: userId,
        creator_id: userId
      },
      {
        title: 'Street Food Festival Live',
        description: 'Die besten Food Trucks der Stadt live! Komm vorbei und probiere alles!',
        location: 'Marktplatz München',
        latitude: 48.1351,
        longitude: 11.5820,
        date_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        category: 'Essen',
        image_url: 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg',
        is_published: true,
        allow_livestream: true,
        user_id: userId,
        creator_id: userId
      },
      {
        title: 'Live Poetry Slam',
        description: 'Spontane Wortakrobatik! Die besten Slam-Poeten der Stadt live auf der Bühne!',
        location: 'Kulturzentrum Köln',
        latitude: 50.9375,
        longitude: 6.9603,
        date_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        category: 'Kultur',
        image_url: 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg',
        is_published: true,
        allow_livestream: true,
        user_id: userId,
        creator_id: userId
      },
      {
        title: 'Graffiti Art Live Session',
        description: 'Watch the magic happen! Urban art in Echtzeit von den besten Street Artists!',
        location: 'Urban Art Gallery Frankfurt',
        latitude: 50.1109,
        longitude: 8.6821,
        date_time: new Date(Date.now() + 1.5 * 60 * 60 * 1000).toISOString(),
        category: 'Kultur',
        image_url: 'https://images.pexels.com/photos/1194420/pexels-photo-1194420.jpeg',
        is_published: true,
        allow_livestream: true,
        user_id: userId,
        creator_id: userId
      },
      {
        title: 'Live Skateboard Contest',
        description: 'Die besten Tricks live! Sei dabei wenn die Pros zeigen was sie können!',
        location: 'Skatepark West Stuttgart',
        latitude: 48.7758,
        longitude: 9.1829,
        date_time: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        category: 'Sport',
        image_url: 'https://images.pexels.com/photos/2398375/pexels-photo-2398375.jpeg',
        is_published: true,
        allow_livestream: true,
        user_id: userId,
        creator_id: userId
      },
      {
        title: 'Late Night Jazz Session',
        description: 'Smooth jazz vibes mitten in der Nacht. Für alle Nachtschwärmer und Jazz-Liebhaber!',
        location: 'Blue Note Club Berlin',
        latitude: 52.5200,
        longitude: 13.4050,
        date_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        category: 'Musik',
        image_url: 'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg',
        is_published: true,
        allow_livestream: true,
        user_id: userId,
        creator_id: userId
      },
      {
        title: 'Yoga am Morgen im Park',
        description: 'Starte deinen Tag mit uns! Live Yoga Session im Grünen mit erfahrenen Trainern!',
        location: 'Englischer Garten München',
        latitude: 48.1642,
        longitude: 11.6056,
        date_time: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        category: 'Sport',
        image_url: 'https://images.pexels.com/photos/3822167/pexels-photo-3822167.jpeg',
        is_published: true,
        allow_livestream: true,
        user_id: userId,
        creator_id: userId
      },
      {
        title: 'Electronic Music Marathon',
        description: '8 Stunden Non-Stop Electronic Music! Die besten DJs aus Europa live!',
        location: 'Warehouse Club Hamburg',
        latitude: 53.5511,
        longitude: 9.9937,
        date_time: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        category: 'Musik',
        image_url: 'https://images.pexels.com/photos/2240763/pexels-photo-2240763.jpeg',
        is_published: true,
        allow_livestream: true,
        user_id: userId,
        creator_id: userId
      },
      {
        title: 'Live Cooking Show',
        description: 'Spitzenköche zeigen ihre Tricks! Lerne von den Besten und stelle Fragen!',
        location: 'Gourmet Kitchen Berlin',
        latitude: 52.5200,
        longitude: 13.4050,
        date_time: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(),
        category: 'Essen',
        image_url: 'https://images.pexels.com/photos/2696064/pexels-photo-2696064.jpeg',
        is_published: true,
        allow_livestream: true,
        user_id: userId,
        creator_id: userId
      }
    ];

    // Events erstellen
    console.log('\n📝 Erstelle Events...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .insert(demoEvents)
      .select();

    if (eventsError) {
      console.error('❌ Fehler beim Erstellen der Events:', eventsError);
      return;
    }

    console.log(`✅ ${events.length} Events erstellt!`);

    // Livestreams erstellen
    console.log('\n📺 Erstelle Livestreams...');
    const livestreams = events.map(event => ({
      event_id: event.id,
      streamer_id: userId,
      title: event.title,
      description: 'Live Stream läuft! Sei dabei!',
      playback_url: `https://example.com/stream/${event.id}`,
      viewer_count: Math.floor(Math.random() * 800 + 50),
      peak_viewers: Math.floor(Math.random() * 1500 + 100),
      total_likes: Math.floor(Math.random() * 500 + 20),
      coins_earned: Math.floor(Math.random() * 300 + 10),
      xp_earned: Math.floor(Math.random() * 200 + 50),
      ad_impressions: Math.floor(Math.random() * 50 + 5),
      status: 'live',
      started_at: new Date(Date.now() - Math.random() * 45 * 60 * 1000).toISOString()
    }));

    const { data: streams, error: streamsError } = await supabase
      .from('livestreams')
      .insert(livestreams)
      .select();

    if (streamsError) {
      console.error('❌ Fehler beim Erstellen der Livestreams:', streamsError);
      return;
    }

    console.log(`✅ ${streams.length} Livestreams erstellt!`);

    console.log('\n🎉 Demo Daten erfolgreich erstellt!');
    console.log(`\n📊 Zusammenfassung:`);
    console.log(`   - Events: ${events.length}`);
    console.log(`   - Livestreams: ${streams.length}`);
    console.log(`   - Gesamte Zuschauer: ${streams.reduce((sum, s) => sum + s.viewer_count, 0)}`);

  } catch (error) {
    console.error('❌ Unerwarteter Fehler:', error);
  }
}

createDemoData();
