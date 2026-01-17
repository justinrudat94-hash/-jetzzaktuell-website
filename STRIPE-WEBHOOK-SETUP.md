# Stripe Webhook Setup Guide

## Overview

This guide explains how to configure Stripe webhooks for the jetzz.app platform.

## Current Webhook Configuration

### Webhook #1: jetzz-platform-webhook (PRIMARY - ACTIVE)
- **Webhook ID**: `we_1SacaoCFeiVVSQ6TaEtGMsr2`
- **URL**: `https://vhhfztpijdemocghpwqj.supabase.co/functions/v1/stripe-webhook`
- **Secret**: `whsec_pPJGhonkC187MaG1kM4ADYc8QPfL6pV4`
- **Purpose**: Handles all platform events (subscriptions, payments, payouts)
- **Events**: 14 events monitored

### Webhook #2: STRIPE_WEBHOOK_SECRET_IDENTITY (OPTIONAL)
- **Webhook ID**: `we_1SadzpCFeiVVSQ6Tnt00HDJK`
- **URL**: `https://vhhfztpijdemocghpwqj.supabase.co/functions/v1/stripe-webhook`
- **Secret**: `whsec_wVfLwCqVqYmzAGfdDCd63mC1Ig2qbT64`
- **Purpose**: Stripe Identity KYC verification events
- **Events**: 4 events monitored (identity.*)
- **Status**: Not yet used (0 events)

### Webhook #3: Unnamed (OPTIONAL)
- **Webhook ID**: `we_1SaenZCFeiVVSQ6Tq486xtwk`
- **URL**: `https://vhhfztpijdemocghpwqj.supabase.co/functions/v1/stripe-webhook`
- **Secret**: `whsec_nipF775JioCVhLNIWOO7p7inyZDXdRBW`
- **Purpose**: Unknown
- **Events**: 18 events monitored
- **Status**: Not yet used (0 events)
- **Recommendation**: Delete this webhook to avoid confusion

## How the Webhook Handler Works

The edge function automatically determines which webhook secret to use based on the event type:

1. **Identity Events** (`identity.*`)
   - Uses `STRIPE_WEBHOOK_SECRET_IDENTITY` if configured
   - Falls back to `STRIPE_WEBHOOK_SECRET_PLATFORM` if not configured

2. **Connect Events** (`account.*`, `capability.*`, `person.*`)
   - Uses `STRIPE_WEBHOOK_SECRET_CONNECT` if configured
   - Falls back to `STRIPE_WEBHOOK_SECRET_PLATFORM` if not configured

3. **Platform Events** (all others)
   - Uses `STRIPE_WEBHOOK_SECRET_PLATFORM`

## Setup Instructions

### Step 1: Configure Supabase Edge Function Secrets

You MUST set these secrets in your Supabase project:

```bash
# Navigate to: Supabase Dashboard -> Project Settings -> Edge Functions -> Secrets

# Required:
STRIPE_WEBHOOK_SECRET_PLATFORM=whsec_pPJGhonkC187MaG1kM4ADYc8QPfL6pV4

# Optional (recommended for separate KYC webhook):
STRIPE_WEBHOOK_SECRET_IDENTITY=whsec_wVfLwCqVqYmzAGfdDCd63mC1Ig2qbT64

# Optional (only if using Stripe Connect with connected accounts):
STRIPE_WEBHOOK_SECRET_CONNECT=whsec_your_connect_webhook_secret_here
```

### Step 2: Deploy the Edge Function

The webhook handler is automatically deployed when you push changes. To manually deploy:

```bash
npx supabase functions deploy stripe-webhook
```

### Step 3: Test the Webhook

1. Go to Stripe Dashboard -> Webhooks -> jetzz-platform-webhook
2. Click "Send test webhook"
3. Select any event (e.g., `account.updated`)
4. Check Supabase Edge Function logs for successful verification

Expected log output:
```
Processing event type: account.updated using platform webhook secret
✓ Webhook signature verified successfully for event: account.updated (source: platform)
Account updated: acct_1REQzcCFeiVVSQ6T
```

## Troubleshooting

### Error: "Webhook not configured"
- **Cause**: No webhook secret is configured in Supabase
- **Solution**: Add `STRIPE_WEBHOOK_SECRET_PLATFORM` to Edge Function secrets

### Error: "Invalid signature"
- **Cause**: Wrong webhook secret or secret mismatch
- **Solution**: Verify the webhook secret matches the one in Stripe Dashboard

### 100% Error Rate on Webhook #1
- **Cause**: Old/wrong webhook secret in environment variables
- **Solution**: Update `.env` and Supabase secrets with correct values from this document

## Recommendations

### Option A: Single Webhook for Everything (Recommended)
- Use only Webhook #1 (jetzz-platform-webhook)
- Configure it to listen to ALL events you need
- Delete Webhooks #2 and #3
- Simplest setup, easiest to debug

### Option B: Separate Webhooks by Purpose
- Webhook #1: Platform events (subscriptions, payments)
- Webhook #2: Identity events (KYC verification)
- More organized but requires separate secret management

## Event Types Handled

The webhook handler processes these event types:

### Subscription Events
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`
- `customer.subscription.resumed`

### Payment Events
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `invoice.payment_action_required`

### Payout Events
- `payout.paid`
- `payout.failed`

### Account Events
- `account.updated`

### Identity Events (KYC)
- `identity.verification_session.created`
- `identity.verification_session.verified`
- `identity.verification_session.requires_input`

## Security Notes

- Never expose webhook secrets in frontend code
- Always verify webhook signatures
- Use different secrets for development and production
- Rotate secrets periodically for security

## Support

If webhooks are still failing after following this guide:
1. Check Supabase Edge Function logs
2. Check Stripe webhook delivery attempts
3. Verify all secrets are correctly configured
4. Contact support with error logs
