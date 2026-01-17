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
    console.log("[START] Resuming Subscription");

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

    const { subscriptionId } = await req.json();

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
      .select("*")
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

    if (!subscription.is_paused) {
      console.log("[INFO] Subscription is not paused");
      return new Response(JSON.stringify({
        error: "Not paused",
        message: "Subscription is not currently paused",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[INFO] Resuming subscription in Stripe...");
    await stripe.subscriptions.update(subscriptionId, {
      pause_collection: null,
    });
    console.log("[SUCCESS] Subscription resumed in Stripe");

    // Update database
    const { error: updateError } = await supabase
      .from("premium_subscriptions")
      .update({
        is_paused: false,
        pause_start_date: null,
        pause_end_date: null,
        pause_reason: null,
        pause_collection_method: null,
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
      action: "resumed",
      old_status: subscription.status,
      new_status: subscription.status,
      changed_by_type: "user",
      reason: "User resumed subscription",
      metadata: {
        resumed_at: new Date().toISOString(),
      },
    });

    console.log("[SUCCESS] Subscription resumed successfully");

    return new Response(JSON.stringify({
      success: true,
      message: "Subscription resumed successfully",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[ERROR] Failed to resume subscription:", error);
    console.error("[ERROR] Stack:", error.stack);

    return new Response(JSON.stringify({
      error: "Failed to resume subscription",
      message: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
