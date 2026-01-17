import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.5.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-12-18.acacia",
    });

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user's active subscription
    const { data: subscription, error: subError } = await supabase
      .from("premium_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["active", "trialing", "past_due"])
      .maybeSingle();

    if (subError) {
      console.error("Error fetching subscription:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscription" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // No active subscription found
    if (!subscription || !subscription.stripe_subscription_id) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active subscription to cancel",
          hadSubscription: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Cancel subscription immediately in Stripe
    const canceledSubscription = await stripe.subscriptions.cancel(
      subscription.stripe_subscription_id
    );

    console.log(
      `Canceled subscription ${subscription.stripe_subscription_id} for user ${userId}`
    );

    // Update subscription status in database
    await supabase
      .from("premium_subscriptions")
      .update({
        status: "canceled",
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Subscription canceled successfully",
        hadSubscription: true,
        subscriptionId: subscription.stripe_subscription_id,
        canceledAt: canceledSubscription.canceled_at,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error canceling subscription on account deletion:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});