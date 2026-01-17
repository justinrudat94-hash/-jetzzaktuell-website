import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PexelsPhoto {
  id: number;
  src: {
    original: string;
    large: string;
    large2x: string;
    medium: string;
  };
}

interface PexelsResponse {
  photos: PexelsPhoto[];
}

const categoryToSearchTerm: { [key: string]: string } = {
  "Musik": "concert music festival",
  "Sport": "sports game stadium",
  "Kunst": "art exhibition gallery",
  "Theater": "theater stage performance",
  "Party": "party nightclub celebration",
  "Essen": "restaurant food dining",
  "Familie": "family children activities",
  "Bildung": "education workshop seminar",
  "Natur": "nature outdoor hiking",
  "Technologie": "technology conference",
  "Gesundheit": "fitness health wellness",
  "Sonstiges": "event people gathering",
  "default": "event people gathering"
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { scrapedEventId, category } = await req.json();

    if (!scrapedEventId) {
      throw new Error("scrapedEventId is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const pexelsApiKey = Deno.env.get("PEXELS_API_KEY");

    if (!pexelsApiKey) {
      console.warn("PEXELS_API_KEY not set, using placeholder image");
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase
        .from("scraped_events")
        .update({
          image_url: "https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg"
        })
        .eq("id", scrapedEventId);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Using placeholder image (Pexels API key not configured)",
          imageUrl: "https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const searchTerm = categoryToSearchTerm[category] || categoryToSearchTerm["default"];

    const pexelsResponse = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerm)}&per_page=15`,
      {
        headers: {
          Authorization: pexelsApiKey,
        },
      }
    );

    if (!pexelsResponse.ok) {
      throw new Error(`Pexels API error: ${pexelsResponse.statusText}`);
    }

    const pexelsData: PexelsResponse = await pexelsResponse.json();

    if (!pexelsData.photos || pexelsData.photos.length === 0) {
      throw new Error("No images found on Pexels");
    }

    const randomIndex = Math.floor(Math.random() * pexelsData.photos.length);
    const selectedPhoto = pexelsData.photos[randomIndex];
    const imageUrl = selectedPhoto.src.large;

    const { error: updateError } = await supabase
      .from("scraped_events")
      .update({ image_url: imageUrl })
      .eq("id", scrapedEventId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Image assigned successfully",
        imageUrl: imageUrl
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in assign-pexels-image:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
