import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-12-18.acacia",
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, kyc_verification_status, stripe_identity_verification_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.kyc_verification_status === "verified") {
      return new Response(JSON.stringify({ 
        error: "Already verified",
        status: "verified"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.kyc_verification_status === "pending" && profile.stripe_identity_verification_id) {
      try {
        const existingSession = await stripe.identity.verificationSessions.retrieve(
          profile.stripe_identity_verification_id
        );

        if (existingSession.status === "requires_input") {
          return new Response(JSON.stringify({
            client_secret: existingSession.client_secret,
            verification_url: existingSession.url,
            session_id: existingSession.id,
            status: existingSession.status
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (err) {
        console.log("Existing session not found or expired, creating new one");
      }
    }

    const verificationSession = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: {
        user_id: user.id,
        email: profile.email || "",
      },
      options: {
        document: {
          allowed_types: ["driving_license", "passport", "id_card"],
          require_id_number: true,
          require_live_capture: true,
          require_matching_selfie: true,
        },
      },
      return_url: `${req.headers.get("origin") || "https://app.jetzz.de"}/profile/kyc-callback`,
    });

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        stripe_identity_verification_id: verificationSession.id,
        kyc_verification_status: "pending",
        kyc_verification_last_attempt: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update profile:", updateError);
    }

    return new Response(JSON.stringify({
      client_secret: verificationSession.client_secret,
      verification_url: verificationSession.url,
      session_id: verificationSession.id,
      status: verificationSession.status
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error creating verification session:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});