import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import type Stripe from "npm:stripe@17.5.0";

console.log('[INIT] ========================================')
console.log('[INIT] Stripe Webhook Function Loading...');
console.log('[INIT] ========================================');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, stripe-signature",
};

function maskSecret(secret: string): string {
  if (!secret || secret.length < 20) return "[INVALID_SECRET]";
  return `${secret.substring(0, 10)}...${secret.substring(secret.length - 10)}`;
}

function getAllStripeSecrets(): Record<string, string> {
  const allEnvVars = Deno.env.toObject();
  const stripeSecrets: Record<string, string> = {};

  for (const [key, value] of Object.entries(allEnvVars)) {
    if ((key.includes('STRIPE') || key.includes('WEBHOOK')) && value && value.startsWith('whsec_')) {
      stripeSecrets[key] = maskSecret(value);
    }
  }

  return stripeSecrets;
}

function findWebhookSecret(eventType: string): { secret: string; source: string; secretName: string } | null {
  const allEnvVars = Deno.env.toObject();

  console.log('[DEBUG] ===== WEBHOOK SECRET DETECTION =====');
  const allSecrets = getAllStripeSecrets();
  for (const [name, masked] of Object.entries(allSecrets)) {
    console.log(`[DEBUG] ${name}: ${masked}`);
  }
  console.log('[DEBUG] =========================================');

  const mainSecret = allEnvVars['STRIPE_WEBHOOK_SECRET'];
  if (mainSecret && mainSecret.startsWith('whsec_')) {
    console.log(`[INFO] Using STRIPE_WEBHOOK_SECRET`);
    return { secret: mainSecret, source: 'main', secretName: 'STRIPE_WEBHOOK_SECRET' };
  }

  if (eventType.startsWith('identity.')) {
    const identitySecretNames = [
      'STRIPE_WEBHOOK_SECRET_IDENTITY',
      'STRIPE_IDENTITY_WEBHOOK_SECRET',
      'STRIPE_WEBHOOK_IDENTITY',
    ];

    for (const name of identitySecretNames) {
      const secret = allEnvVars[name];
      if (secret && secret.startsWith('whsec_')) {
        console.log(`[INFO] Using Identity Webhook Secret: ${name}`);
        return { secret, source: 'identity', secretName: name };
      }
    }
  }

  const platformSecretNames = [
    'STRIPE_WEBHOOK_SECRET_PLATFORM',
    'STRIPE_PLATFORM_WEBHOOK_SECRET',
    'WEBHOOK_SECRET',
  ];

  for (const name of platformSecretNames) {
    const secret = allEnvVars[name];
    if (secret && secret.startsWith('whsec_')) {
      console.log(`[INFO] Using Platform Webhook Secret: ${name}`);
      return { secret, source: 'platform', secretName: name };
    }
  }

  console.error('[ERROR] No valid webhook secret found!');
  console.error('[ERROR] Available secrets:', Object.keys(allSecrets));
  return null;
}

function calculateVatAmounts(grossAmount: number, vatRate: number) {
  const netAmount = Math.round((grossAmount / (1 + vatRate / 100)) * 100) / 100;
  const vatAmount = Math.round((grossAmount - netAmount) * 100) / 100;
  return { netAmount, vatAmount };
}

async function getVatRateFromDb(supabase: any, countryCode: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_vat_rate', {
      p_country_code: countryCode,
      p_date: new Date().toISOString().split('T')[0],
    });

    if (error || !data) {
      console.warn(`[UST] No VAT rate found for ${countryCode}, defaulting to 0`);
      return 0;
    }

    return data;
  } catch (error) {
    console.error('[UST] Error fetching VAT rate:', error);
    return 0;
  }
}

function extractCountryFromAddress(address: any): string {
  if (!address) return 'DE';
  return address.country || 'DE';
}

async function trackUstTransaction(
  supabase: any,
  data: {
    transactionType: 'coin_purchase' | 'premium_subscription' | 'ticket_purchase' | 'boost_purchase';
    userId: string;
    stripePaymentIntentId: string;
    relatedEntityId?: string;
    countryCode: string;
    grossAmount: number;
    serviceDescription: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    const vatRate = await getVatRateFromDb(supabase, data.countryCode);

    if (vatRate === 0) {
      console.warn(`[UST] No VAT rate configured for country: ${data.countryCode}`);
      return;
    }

    const { netAmount, vatAmount } = calculateVatAmounts(data.grossAmount, vatRate);

    const { error } = await supabase.from('ust_transactions').insert({
      transaction_type: data.transactionType,
      user_id: data.userId,
      stripe_payment_intent_id: data.stripePaymentIntentId,
      related_entity_id: data.relatedEntityId,
      country_code: data.countryCode,
      gross_amount: data.grossAmount,
      net_amount: netAmount,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      service_description: data.serviceDescription,
      metadata: data.metadata || {},
    });

    if (error) {
      console.error('[UST] Error tracking USt transaction:', error);
    } else {
      console.log(`[UST] ✓ Tracked ${data.transactionType}: €${data.grossAmount} (${data.countryCode}, VAT ${vatRate}%, Net: €${netAmount}, VAT: €${vatAmount})`);
    }
  } catch (error) {
    console.error('[UST] Exception in trackUstTransaction:', error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("[STARTUP] ========================================");
    console.log("[STARTUP] Initializing Stripe Webhook Handler...");

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeSecretKey) {
      console.error("[FATAL] STRIPE_SECRET_KEY not found!");
      const availableStripeVars = Object.keys(Deno.env.toObject()).filter(k => k.includes('STRIPE'));
      console.error("[FATAL] Available STRIPE env vars:", availableStripeVars);

      return new Response(JSON.stringify({
        error: "Configuration Error",
        message: "STRIPE_SECRET_KEY is not configured",
        hint: "Set STRIPE_SECRET_KEY in Supabase Dashboard → Edge Functions → Secrets",
        availableStripeVars,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (stripeSecretKey.length === 0) {
      console.error("[FATAL] STRIPE_SECRET_KEY is empty!");
      return new Response(JSON.stringify({
        error: "Configuration Error",
        message: "STRIPE_SECRET_KEY exists but is empty",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[STARTUP] ✓ STRIPE_SECRET_KEY validated: ${stripeSecretKey.substring(0, 10)}...`);

    console.log("[STARTUP] Importing Stripe SDK...");
    const { default: Stripe } = await import("npm:stripe@17.5.0");
    console.log("[STARTUP] ✓ Stripe SDK imported");

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-03-31.basil",
    });
    console.log("[STARTUP] ✓ Stripe SDK initialized");

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("[ERROR] Missing stripe-signature header");
      return new Response(JSON.stringify({
        error: "Missing Signature",
        message: "stripe-signature header is required",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bodyBuffer = await req.arrayBuffer();
    const body = new TextDecoder('utf-8').decode(bodyBuffer);

    let eventType = "unknown";
    try {
      const parsedBody = JSON.parse(body);
      eventType = parsedBody.type || "unknown";
    } catch (e) {
      console.error("[ERROR] Failed to parse event body:", e);
    }

    console.log(`[INFO] ========================================`);
    console.log(`[INFO] Incoming Webhook Event: ${eventType}`);
    console.log(`[INFO] ========================================`);

    const secretInfo = findWebhookSecret(eventType);

    if (!secretInfo) {
      const allSecrets = getAllStripeSecrets();
      console.error("[FATAL] No webhook secret available!");
      return new Response(JSON.stringify({
        error: "Configuration Error",
        message: "No webhook secret configured",
        availableSecrets: Object.keys(allSecrets),
        hint: "Set STRIPE_WEBHOOK_SECRET in Supabase Dashboard",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[INFO] Using webhook secret: ${secretInfo.secretName}`);
    console.log(`[INFO] Masked value: ${maskSecret(secretInfo.secret)}`);

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        secretInfo.secret
      );
      console.log(`[SUCCESS] ========================================`);
      console.log(`[SUCCESS] ✓ Webhook Signature Verified!`);
      console.log(`[SUCCESS] Event Type: ${event.type}`);
      console.log(`[SUCCESS] Event ID: ${event.id}`);
      console.log(`[SUCCESS] ========================================`);
    } catch (err) {
      console.error(`[ERROR] ========================================`);
      console.error(`[ERROR] ✗ Signature Verification FAILED`);
      console.error(`[ERROR] Error: ${err.message}`);
      console.error(`[ERROR] Used Secret: ${secretInfo.secretName}`);
      console.error(`[ERROR] Event Type: ${eventType}`);
      console.error(`[ERROR] ========================================`);

      const allSecrets = getAllStripeSecrets();
      return new Response(JSON.stringify({
        error: "Invalid Signature",
        message: err.message,
        usedSecret: secretInfo.secretName,
        availableSecrets: Object.keys(allSecrets),
        hint: "Webhook secret mismatch! Copy the EXACT signing secret from Stripe Dashboard → Webhooks → [Your Endpoint] → Signing Secret",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseUrl || !supabaseKey) {
      console.error("[FATAL] Supabase credentials missing!");
      return new Response(JSON.stringify({
        error: "Configuration Error",
        message: "Supabase credentials not configured",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("[STARTUP] ✓ Supabase client initialized");

    console.log(`[PROCESSING] Handling event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("[HANDLER] Processing checkout.session.completed:", session.id);

        const metadata = session.metadata;
        if (metadata?.type === "coin_purchase") {
          const userId = metadata.user_id;
          const coinAmount = parseInt(metadata.coin_amount || "0");
          const amountPaid = session.amount_total || 0;
          const amountEur = amountPaid / 100;
          const coinRate = amountEur / coinAmount;

          console.log(`[HANDLER] Coin purchase detected: ${coinAmount} coins for user ${userId} (€${amountEur})`);

          const { error: purchaseError } = await supabase.from("coin_purchases").insert({
            user_id: userId,
            stripe_payment_id: session.payment_intent as string,
            stripe_customer_id: session.customer as string,
            amount_eur: amountEur,
            coins_purchased: coinAmount,
            coin_rate: coinRate,
            status: "completed",
            completed_at: new Date().toISOString(),
            metadata: {
              session_id: session.id,
              payment_status: session.payment_status
            }
          });

          if (purchaseError) {
            console.error("[ERROR] Failed to create coin_purchase record:", purchaseError);
          }

          const { data: currentStats } = await supabase
            .from("user_stats")
            .select("total_coins")
            .eq("user_id", userId)
            .maybeSingle();

          const currentCoins = currentStats?.total_coins || 0;
          const newCoins = currentCoins + coinAmount;

          const { error: statsError } = await supabase
            .from("user_stats")
            .update({ total_coins: newCoins })
            .eq("user_id", userId);

          if (statsError) {
            console.error("[ERROR] Failed to update user_stats:", statsError);
          }

          const { error: txError } = await supabase.from("reward_transactions").insert({
            user_id: userId,
            amount: coinAmount,
            reason: `Purchased ${coinAmount} coins via Stripe (Session: ${session.id})`,
            reference_id: null
          });

          if (txError) {
            console.error("[ERROR] Failed to create reward_transaction:", txError);
          }

          if (!purchaseError && !statsError && !txError) {
            console.log(`[SUCCESS] ✓ Coin purchase completed for user ${userId}:`);
            console.log(`[SUCCESS]   - Amount: €${amountEur}`);
            console.log(`[SUCCESS]   - Coins: ${coinAmount}`);
            console.log(`[SUCCESS]   - Balance: ${currentCoins} -> ${newCoins}`);

            const customerCountry = extractCountryFromAddress(session.customer_details?.address);
            console.log(`[UST] Customer country: ${customerCountry}`);

            await trackUstTransaction(supabase, {
              transactionType: 'coin_purchase',
              userId: userId,
              stripePaymentIntentId: session.payment_intent as string,
              countryCode: customerCountry,
              grossAmount: amountEur,
              serviceDescription: `${coinAmount} Coins`,
              metadata: {
                coin_amount: coinAmount,
                session_id: session.id,
              },
            });
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("[HANDLER] Processing subscription update:", subscription.id);

        const userId = subscription.metadata?.user_id;
        if (!userId) {
          console.error("[ERROR] No user_id in subscription metadata");
          break;
        }

        const STRIPE_PRICE_ID_MONTHLY = "price_1Sacd6CFeiVVSQ6TnfQE4fk7";
        const STRIPE_PRICE_ID_YEARLY = "price_1SacebCFeiVVSQ6TDn3zPOpC";

        const isMonthly = subscription.items.data[0]?.price.id === STRIPE_PRICE_ID_MONTHLY;
        const planType = isMonthly ? "monthly" : "yearly";
        const priceAmount = subscription.items.data[0]?.price.unit_amount || 0;

        // Check if this subscription has a trial - defensive null checks
        const hasTrial = typeof subscription.trial_start === 'number' &&
                        typeof subscription.trial_end === 'number' &&
                        subscription.trial_start > 0 &&
                        subscription.trial_end > 0;
        const isTrialing = subscription.status === 'trialing';

        const subscriptionData: any = {
          user_id: userId,
          plan_type: planType,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        };

        // Handle trial tracking with defensive checks
        if (hasTrial) {
          try {
            const trialStartDate = new Date(subscription.trial_start! * 1000);
            const trialEndDate = new Date(subscription.trial_end! * 1000);

            // Validate dates are valid
            if (!isNaN(trialStartDate.getTime()) && !isNaN(trialEndDate.getTime())) {
              subscriptionData.trial_start_date = trialStartDate.toISOString();
              subscriptionData.trial_end_date = trialEndDate.toISOString();

              // Mark that user has used trial (only set on creation or when trialing)
              if (event.type === "customer.subscription.created" || isTrialing) {
                subscriptionData.has_used_trial = true;
              }

              console.log(`[INFO] Trial detected: ${subscriptionData.trial_start_date} to ${subscriptionData.trial_end_date}`);
            } else {
              console.error(`[ERROR] Invalid trial dates: trial_start=${subscription.trial_start}, trial_end=${subscription.trial_end}`);
            }
          } catch (dateError) {
            console.error(`[ERROR] Failed to parse trial dates:`, dateError);
          }
        }

        if (subscription.pause_collection) {
          subscriptionData.is_paused = true;
        }

        if (subscription.canceled_at) {
          subscriptionData.canceled_at = new Date(subscription.canceled_at * 1000).toISOString();
        }

        const { error } = await supabase.from("premium_subscriptions").upsert(subscriptionData, {
          onConflict: "stripe_subscription_id"
        });

        if (error) {
          console.error("[ERROR] Failed to upsert subscription:", error);
        } else {
          console.log(`[SUCCESS] Subscription ${subscription.status} for user ${userId} (Plan: ${planType}${hasTrial ? ' with trial' : ''})`);
        }
        break;
      }

      case "customer.subscription.paused": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("[HANDLER] Processing subscription pause:", subscription.id);

        await supabase.from("premium_subscriptions").update({
          is_paused: true,
        }).eq("stripe_subscription_id", subscription.id);

        await supabase.from("subscription_audit_log").insert({
          subscription_id: subscription.id,
          action: "paused",
          changed_by_type: "stripe_webhook",
          metadata: { event_id: event.id },
        });
        break;
      }

      case "customer.subscription.resumed": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("[HANDLER] Processing subscription resume:", subscription.id);

        await supabase.from("premium_subscriptions").update({
          is_paused: false,
          pause_start_date: null,
          pause_end_date: null,
        }).eq("stripe_subscription_id", subscription.id);

        await supabase.from("subscription_audit_log").insert({
          subscription_id: subscription.id,
          action: "resumed",
          changed_by_type: "stripe_webhook",
          metadata: { event_id: event.id },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("[HANDLER] Processing subscription deletion:", subscription.id);

        const { error } = await supabase
          .from("premium_subscriptions")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString()
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("[ERROR] Failed to cancel subscription:", error);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("[HANDLER] Processing successful invoice payment:", invoice.id);

        if (invoice.subscription) {
          const { data: subscription, error: subError } = await supabase
            .from("premium_subscriptions")
            .update({ status: "active" })
            .eq("stripe_subscription_id", invoice.subscription)
            .select()
            .maybeSingle();

          if (subError) {
            console.error("[ERROR] Failed to activate subscription:", subError);
          } else if (subscription) {
            const amountPaid = invoice.amount_paid || 0;
            const amountEur = amountPaid / 100;

            let customerCountry = 'DE';
            if (invoice.customer) {
              try {
                const customer = await stripe.customers.retrieve(invoice.customer as string);
                if ('deleted' in customer && customer.deleted) {
                  console.log('[UST] Customer was deleted, using default DE');
                } else if ('address' in customer) {
                  customerCountry = extractCountryFromAddress(customer.address);
                }
              } catch (err) {
                console.error('[UST] Error fetching customer for country:', err);
              }
            }
            console.log(`[UST] Customer country: ${customerCountry}`);

            await trackUstTransaction(supabase, {
              transactionType: 'premium_subscription',
              userId: subscription.user_id,
              stripePaymentIntentId: invoice.payment_intent as string,
              relatedEntityId: subscription.id,
              countryCode: customerCountry,
              grossAmount: amountEur,
              serviceDescription: `Premium ${subscription.plan_type} Subscription`,
              metadata: {
                subscription_id: invoice.subscription,
                invoice_id: invoice.id,
                plan_type: subscription.plan_type,
              },
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("[HANDLER] Processing failed invoice payment:", invoice.id);

        if (invoice.subscription) {
          const { data: subscription } = await supabase
            .from("premium_subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription)
            .select()
            .maybeSingle();

          if (subscription) {
            const attemptCount = invoice.attempt_count || 1;
            await supabase.from("payment_retry_log").insert({
              subscription_id: subscription.id,
              user_id: subscription.user_id,
              stripe_payment_intent_id: invoice.payment_intent as string,
              stripe_invoice_id: invoice.id,
              attempt_number: attemptCount,
              status: "failed",
              failure_code: invoice.last_finalization_error?.code || "unknown",
              failure_message: invoice.last_finalization_error?.message || "Payment failed",
              amount: invoice.amount_due,
              currency: invoice.currency,
            });

            await supabase.from("stripe_invoices").upsert({
              stripe_invoice_id: invoice.id,
              subscription_id: subscription.id,
              user_id: subscription.user_id,
              stripe_customer_id: invoice.customer as string,
              amount_due: invoice.amount_due,
              amount_paid: invoice.amount_paid,
              amount_remaining: invoice.amount_remaining,
              currency: invoice.currency,
              status: invoice.status || "open",
              invoice_number: invoice.number,
              invoice_created_at: new Date(invoice.created * 1000).toISOString(),
              invoice_due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
              invoice_pdf_url: invoice.invoice_pdf,
              hosted_invoice_url: invoice.hosted_invoice_url,
              attempt_count: invoice.attempt_count || 1,
              next_payment_attempt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString() : null,
              billing_reason: invoice.billing_reason,
            }, {
              onConflict: "stripe_invoice_id"
            });
          }
        }
        break;
      }

      case "invoice.payment_action_required": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("[HANDLER] Processing invoice requiring action:", invoice.id);

        if (invoice.subscription) {
          const { data: subscription } = await supabase
            .from("premium_subscriptions")
            .select()
            .eq("stripe_subscription_id", invoice.subscription)
            .maybeSingle();

          if (subscription) {
            await supabase.from("payment_retry_log").insert({
              subscription_id: subscription.id,
              user_id: subscription.user_id,
              stripe_payment_intent_id: invoice.payment_intent as string,
              stripe_invoice_id: invoice.id,
              attempt_number: invoice.attempt_count || 1,
              status: "requires_action",
              amount: invoice.amount_due,
              currency: invoice.currency,
            });
          }
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("[HANDLER] Processing successful payment:", paymentIntent.id);

        const metadata = paymentIntent.metadata;
        if (metadata?.type === "ticket_purchase") {
          const userId = metadata.user_id;
          const ticketId = metadata.ticket_id;
          const quantity = parseInt(metadata.quantity || "1");

          const qrCode = `TICKET-${paymentIntent.id}-${Date.now()}`;

          const { data: ticketPurchase, error } = await supabase.from("ticket_purchases").insert({
            user_id: userId,
            ticket_id: ticketId,
            quantity: quantity,
            total_amount: paymentIntent.amount,
            payment_status: "completed",
            qr_code: qrCode,
            stripe_payment_intent_id: paymentIntent.id
          }).select().single();

          if (!error && ticketPurchase) {
            console.log(`[SUCCESS] Created ticket purchase for user ${userId}`);

            const customerCountry = extractCountryFromAddress(paymentIntent.shipping?.address);
            console.log(`[UST] Customer country: ${customerCountry}`);

            const amountEur = paymentIntent.amount / 100;
            await trackUstTransaction(supabase, {
              transactionType: 'ticket_purchase',
              userId: userId,
              stripePaymentIntentId: paymentIntent.id,
              relatedEntityId: ticketPurchase.id,
              countryCode: customerCountry,
              grossAmount: amountEur,
              serviceDescription: `${quantity}x Ticket Purchase`,
              metadata: {
                ticket_id: ticketId,
                quantity: quantity,
              },
            });
          } else {
            console.error("[ERROR] Failed to create ticket purchase:", error);
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("[HANDLER] Processing failed payment:", paymentIntent.id);

        const metadata = paymentIntent.metadata;
        if (metadata?.type === "ticket_purchase") {
          await supabase.from("ticket_purchases").update({
            payment_status: "failed"
          }).eq("stripe_payment_intent_id", paymentIntent.id);
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        console.log("[HANDLER] Processing account update:", account.id);

        const { data: existingAccount } = await supabase
          .from("stripe_connected_accounts")
          .select("id")
          .eq("stripe_account_id", account.id)
          .maybeSingle();

        if (existingAccount) {
          const { error } = await supabase
            .from("stripe_connected_accounts")
            .update({
              details_submitted: account.details_submitted,
              charges_enabled: account.charges_enabled,
              payouts_enabled: account.payouts_enabled
            })
            .eq("stripe_account_id", account.id);

          if (error) {
            console.error("[ERROR] Failed to update account:", error);
          } else {
            console.log("[SUCCESS] Account updated successfully");
          }
        } else {
          console.log("[INFO] Account not found in database, skipping update");
        }
        break;
      }

      case "payout.paid": {
        const payout = event.data.object as Stripe.Payout;
        console.log("[HANDLER] Processing completed payout:", payout.id);

        const { error } = await supabase
          .from("creator_payouts")
          .update({
            status: "completed",
            completed_at: new Date().toISOString()
          })
          .eq("stripe_payout_id", payout.id);

        if (error) {
          console.error("[ERROR] Failed to update payout:", error);
        } else {
          console.log("[SUCCESS] Payout updated successfully");
        }
        break;
      }

      case "payout.failed": {
        const payout = event.data.object as Stripe.Payout;
        console.log("[HANDLER] Processing failed payout:", payout.id);

        const { error } = await supabase
          .from("creator_payouts")
          .update({
            status: "failed"
          })
          .eq("stripe_payout_id", payout.id);

        if (error) {
          console.error("[ERROR] Failed to update failed payout:", error);
        } else {
          console.log("[SUCCESS] Failed payout updated successfully");
        }
        break;
      }

      case "identity.verification_session.created": {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        console.log("[HANDLER] Processing identity verification creation:", session.id);

        const userId = session.metadata?.user_id;
        if (!userId) {
          console.error("[ERROR] No user_id in verification session metadata");
          break;
        }

        const { error } = await supabase.from("profiles").update({
          stripe_identity_verification_id: session.id,
          kyc_verification_status: "pending",
          kyc_verification_last_attempt: new Date().toISOString()
        }).eq("id", userId);

        if (error) {
          console.error("[ERROR] Failed to update profile with verification session:", error);
        } else {
          console.log(`[SUCCESS] Started KYC verification for user ${userId}`);
        }
        break;
      }

      case "identity.verification_session.verified": {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        console.log("[HANDLER] Processing verified identity:", session.id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_identity_verification_id", session.id)
          .maybeSingle();

        if (profile) {
          const verifiedData = session.verified_outputs;
          const updateData: any = {
            kyc_verification_status: "verified",
            kyc_verified_at: new Date().toISOString(),
          };

          if (verifiedData?.first_name) updateData.kyc_verified_first_name = verifiedData.first_name;
          if (verifiedData?.last_name) updateData.kyc_verified_last_name = verifiedData.last_name;
          if (verifiedData?.dob) {
            const dob = verifiedData.dob;
            updateData.kyc_verified_dob = `${dob.year}-${String(dob.month).padStart(2, '0')}-${String(dob.day).padStart(2, '0')}`;
          }
          if (verifiedData?.address) {
            const addr = verifiedData.address;
            updateData.kyc_verified_address = JSON.stringify({
              line1: addr.line1,
              line2: addr.line2,
              city: addr.city,
              postal_code: addr.postal_code,
              country: addr.country
            });
          }
          if (verifiedData?.id_number) updateData.kyc_verified_id_number = verifiedData.id_number;

          const { error } = await supabase.from("profiles").update(updateData).eq("id", profile.id);

          if (error) {
            console.error("[ERROR] Failed to update verified profile:", error);
          } else {
            console.log(`[SUCCESS] KYC verification completed for user ${profile.id}`);
          }
        } else {
          console.error("[ERROR] Profile not found for verification session:", session.id);
        }
        break;
      }

      case "identity.verification_session.requires_input": {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        console.log("[HANDLER] Processing identity verification requiring input:", session.id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_identity_verification_id", session.id)
          .maybeSingle();

        if (profile) {
          const { error } = await supabase.from("profiles").update({
            kyc_verification_status: "failed",
            kyc_verification_last_attempt: new Date().toISOString()
          }).eq("id", profile.id);

          if (error) {
            console.error("[ERROR] Failed to update profile with failed verification:", error);
          } else {
            console.log(`[SUCCESS] KYC verification failed for user ${profile.id}`);
          }
        }
        break;
      }

      default:
        console.log(`[INFO] Unhandled event type: ${event.type}`);
        console.log(`[INFO] No specific handler implemented for this event`);
    }

    console.log(`[SUCCESS] ========================================`);
    console.log(`[SUCCESS] ✓ Webhook Processed Successfully!`);
    console.log(`[SUCCESS] Event: ${event.type}`);
    console.log(`[SUCCESS] ID: ${event.id}`);
    console.log(`[SUCCESS] ========================================`);

    return new Response(JSON.stringify({
      received: true,
      eventType: event.type,
      eventId: event.id,
      processed: true,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[ERROR] ========================================");
    console.error("[ERROR] ✗ Webhook Processing Failed");
    console.error("[ERROR]", error.message);
    console.error("[ERROR] Stack:", error.stack);
    console.error("[ERROR] ========================================");

    return new Response(
      JSON.stringify({
        error: "Webhook Processing Failed",
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});