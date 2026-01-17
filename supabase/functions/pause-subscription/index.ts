import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    console.log("[START] Pausing Subscription");

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("[ERROR] STRIPE_SECRET_KEY not configured");
      return new Response(JSON.stringify({
        error: "Configuration Error",
        message: "STRIPE_SECRET_KEY not configured",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { default: Stripe } = await import("npm:stripe@17.5.0");
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-03-31.basil",
    });

    const { subscriptionId, reason } = await req.json();

    if (!subscriptionId) {
      console.error("[ERROR] Missing subscriptionId");
      return new Response(JSON.stringify({
        error: "Missing required field",
        message: "subscriptionId is required",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[INFO] Subscription ID: ${subscriptionId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get subscription from database
    const { data: subscription, error: fetchError } = await supabase
      .from("premium_subscriptions")
      .select("*, profiles!inner(email)")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();

    if (fetchError || !subscription) {
      console.error("[ERROR] Subscription not found:", fetchError);
      return new Response(JSON.stringify({
        error: "Subscription not found",
        message: "No subscription found with this ID",
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[INFO] Found subscription for user: ${subscription.user_id}`);

    if (subscription.is_paused) {
      console.log("[INFO] Subscription is already paused");
      return new Response(JSON.stringify({
        error: "Already paused",
        message: "Subscription is already paused",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[INFO] Pausing subscription in Stripe...");
    await stripe.subscriptions.update(subscriptionId, {
      pause_collection: {
        behavior: "keep_as_draft",
      },
    });
    console.log("[SUCCESS] Subscription paused in Stripe");

    // Calculate pause dates (1 month)
    const pauseStartDate = new Date();
    const pauseEndDate = new Date();
    pauseEndDate.setMonth(pauseEndDate.getMonth() + 1);

    // Update database
    const { error: updateError } = await supabase
      .from("premium_subscriptions")
      .update({
        is_paused: true,
        pause_start_date: pauseStartDate.toISOString(),
        pause_end_date: pauseEndDate.toISOString(),
        pause_reason: reason || null,
        pause_collection_method: "keep_as_draft",
      })
      .eq("stripe_subscription_id", subscriptionId);

    if (updateError) {
      console.error("[ERROR] Failed to update subscription in DB:", updateError);
      return new Response(JSON.stringify({
        error: "Database error",
        message: "Failed to update subscription",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[SUCCESS] Subscription updated in database");

    await supabase.from("subscription_audit_log").insert({
      subscription_id: subscription.id,
      user_id: subscription.user_id,
      action: "paused",
      old_status: subscription.status,
      new_status: subscription.status,
      changed_by_type: "user",
      reason: reason || "User requested pause",
      metadata: {
        pause_start: pauseStartDate.toISOString(),
        pause_end: pauseEndDate.toISOString(),
      },
    });

    console.log("[SUCCESS] Subscription paused successfully");
    console.log(`[INFO] Paused until: ${pauseEndDate.toISOString()}`);

    return new Response(JSON.stringify({
      success: true,
      pauseUntil: pauseEndDate.toISOString(),
      message: "Subscription paused successfully",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[ERROR] Failed to pause subscription:", error);
    console.error("[ERROR] Stack:", error.stack);

    return new Response(JSON.stringify({
      error: "Failed to pause subscription",
      message: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
