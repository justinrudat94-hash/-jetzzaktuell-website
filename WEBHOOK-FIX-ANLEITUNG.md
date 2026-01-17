# Stripe Webhook Fix - Komplette Anleitung

## Problem behoben!

Die duplizierten/falschen Webhook Functions wurden entfernt. Jetzt musst du nur noch die Secrets konfigurieren und die Function deployen.

---

## 1. Supabase Edge Function Secrets setzen

Gehe zu deinem Supabase Dashboard:

1. Öffne: https://supabase.com/dashboard/project/wyqrgdbifdhipwgtdvzy/settings/functions
2. Klicke auf **"Add new secret"**
3. Füge diese 2 Secrets hinzu:

```
Name: STRIPE_WEBHOOK_SECRET_PLATFORM
Value: whsec_pPJGhonkC187MaG1kM4ADYc8QPfL6pV4
```

```
Name: STRIPE_WEBHOOK_SECRET_IDENTITY
Value: whsec_wVfLwCqVqYmzAGfdDCd63mC1Ig2qbT64
```

**WICHTIG:** Überprüfe auch, dass diese Secrets bereits gesetzt sind:
- `STRIPE_SECRET_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Function deployen

Führe diesen Befehl in deinem lokalen Terminal aus:

```bash
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

Oder falls du die Supabase CLI global installiert hast:

```bash
supabase functions deploy stripe-webhook --no-verify-jwt
```

**Falls "Access token not provided" Fehler:**
```bash
npx supabase login
```

---

## 3. Stripe Webhooks überprüfen

Gehe zu deinem Stripe Dashboard: https://dashboard.stripe.com/webhooks

### Webhook 1: jetzz-platform-webhook (AKTIV HALTEN)
- URL: `https://wyqrgdbifdhipwgtdvzy.supabase.co/functions/v1/stripe-webhook`
- Secret: `whsec_pPJGhonkC187MaG1kM4ADYc8QPfL6pV4`
- API Version: Setze auf **2025-03-31.basil** (falls anders)
- Events: Alle platform events (subscriptions, payments, payouts, account updates)

**Action:** Bearbeiten und API Version auf `2025-03-31.basil` setzen!

### Webhook 2: STRIPE_WEBHOOK_SECRET_IDENTITY (AKTIV HALTEN)
- URL: `https://wyqrgdbifdhipwgtdvzy.supabase.co/functions/v1/stripe-webhook`
- Secret: `whsec_wVfLwCqVqYmzAGfdDCd63mC1Ig2qbT64`
- API Version: **2025-03-31.basil**
- Events: Nur Identity/KYC events
  - `identity.verification_session.created`
  - `identity.verification_session.verified`
  - `identity.verification_session.requires_input`
  - `identity.verification_session.canceled`

**Action:** Behalten!

### Webhook 3: vhhfztpijdemocghpwqj (LÖSCHEN!)
- URL: `https://vhhfztpijdemocghpwqj.supabase.co/functions/v1/stripe-webhook`
- Das ist ein **alter Supabase Account** (vhhfztpijdemocghpwqj statt wyqrgdbifdhipwgtdvzy)

**Action:** Diesen Webhook LÖSCHEN! Er zeigt auf den falschen Supabase Account.

---

## 4. Testing

Nach dem Deployment:

1. Gehe zu Stripe Dashboard → Webhooks
2. Klicke auf "Send test webhook" für beide aktiven Webhooks
3. Überprüfe die Logs in Supabase:
   - https://supabase.com/dashboard/project/wyqrgdbifdhipwgtdvzy/functions/stripe-webhook/logs

---

## Zusammenfassung der Änderungen

✅ Gelöscht: `/supabase/functions/stripe-webhook-v2/` (dupliziert und falsche API Version)
✅ Behalten: `/supabase/functions/stripe-webhook/` (korrekte Version mit API 2025-03-31.basil)
✅ Secrets dokumentiert: `STRIPE_WEBHOOK_SECRET_PLATFORM` und `STRIPE_WEBHOOK_SECRET_IDENTITY`
✅ Webhook-Cleanup Plan: Löschen des alten vhhfztpijdemocghpwqj Webhooks

---

## Warum haben die Webhooks gefailed?

Die 44 fehlgeschlagenen Deliveries kamen von:
1. Fehlende Edge Function Secrets im Supabase Dashboard
2. Möglicherweise falsche API Version im Webhook (2024-12-18 statt 2025-03-31)

Nach dem Setzen der Secrets und dem Deployment sollten alle neuen Webhooks erfolgreich sein!

---

## Fragen?

Falls du noch Fehler siehst, schau dir die Function Logs an:
https://supabase.com/dashboard/project/wyqrgdbifdhipwgtdvzy/functions/stripe-webhook/logs

Die Function loggt jetzt detailliert welche Secrets gefunden/nicht gefunden wurden.
