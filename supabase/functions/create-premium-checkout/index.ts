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
    console.log("[START] Creating Premium Checkout Session");

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

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, plan } = await req.json();

    if (!userId || !plan) {
      console.error("[ERROR] Missing userId or plan");
      return new Response(JSON.stringify({
        error: "Missing required fields",
        message: "userId and plan are required",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (plan !== 'monthly' && plan !== 'yearly') {
      console.error("[ERROR] Invalid plan:", plan);
      return new Response(JSON.stringify({
        error: "Invalid plan",
        message: "Plan must be 'monthly' or 'yearly'",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[INFO] User: ${userId}, Plan: ${plan}`);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('billing_data_complete, email, first_name, last_name, billing_address, billing_city, billing_postal_code, billing_country, stripe_customer_id')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("[ERROR] Profile not found:", profileError);
      return new Response(JSON.stringify({
        error: "Profile not found",
        message: "User profile could not be loaded",
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile.billing_data_complete) {
      console.log("[INFO] Billing data incomplete for user:", userId);
      return new Response(JSON.stringify({
        error: "Incomplete profile",
        message: "Please complete your billing information first",
        requiresBillingData: true,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[INFO] Checking trial eligibility...");
    const { data: existingSub } = await supabase
      .from('premium_subscriptions')
      .select('id, has_used_trial')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const hasUsedTrial = existingSub?.has_used_trial || false;
    console.log(`[INFO] Trial used: ${hasUsedTrial}`);

    const priceIds = {
      monthly: Deno.env.get("STRIPE_PRICE_MONTHLY") || "price_1Sacd6CFeiVVSQ6TnfQE4fk7",
      yearly: Deno.env.get("STRIPE_PRICE_YEARLY") || "price_1SacebCFeiVVSQ6TDn3zPOpC",
    };

    const priceId = priceIds[plan];
    console.log(`[INFO] Using price ID: ${priceId}`);

    let stripeCustomerId = profile.stripe_customer_id;

    if (!stripeCustomerId) {
      console.log("[INFO] Creating new Stripe customer...");
      const customer = await stripe.customers.create({
        email: profile.email,
        name: `${profile.first_name} ${profile.last_name}`,
        address: {
          line1: profile.billing_address || '',
          city: profile.billing_city || '',
          postal_code: profile.billing_postal_code || '',
          country: profile.billing_country || 'DE',
        },
        metadata: {
          user_id: userId,
        },
      });

      stripeCustomerId = customer.id;

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', userId);

      console.log(`[SUCCESS] Created Stripe customer: ${stripeCustomerId}`);
    } else {
      console.log(`[INFO] Using existing Stripe customer: ${stripeCustomerId}`);
    }

    const origin = req.headers.get('origin') || 'https://jetzz.app';

    const sessionParams: any = {
      customer: stripeCustomerId,
      payment_method_types: ['card', 'sepa_debit'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/subscription-management?success=true`,
      cancel_url: `${origin}/subscription-management?canceled=true`,
      metadata: {
        user_id: userId,
        plan_type: plan,
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          plan_type: plan,
        },
      },
    };

    if (!hasUsedTrial) {
      sessionParams.subscription_data.trial_period_days = 7;
      console.log(`[INFO] Adding 7-day trial for user ${userId}`);
    } else {
      console.log(`[INFO] User ${userId} has already used trial - no trial period`);
    }

    console.log("[INFO] Creating Stripe checkout session...");
    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`[SUCCESS] Created checkout session: ${session.id}`);
    console.log(`[SUCCESS] Plan: ${plan}, User: ${userId}, Trial: ${!hasUsedTrial}`);

    return new Response(JSON.stringify({
      url: session.url,
      sessionId: session.id,
      hasTrial: !hasUsedTrial,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[ERROR] Failed to create checkout session:", error);
    console.error("[ERROR] Stack:", error.stack);

    return new Response(JSON.stringify({
      error: "Failed to create checkout",
      message: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});