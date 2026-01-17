# Stripe Premium Subscription - Test Anleitung

## VORAUSSETZUNGEN

Vor dem Testen sicherstellen, dass:

- [x] `.env` mit neuen Supabase Credentials aktualisiert
- [x] Datenbank-Migrationen angewendet (premium_plans, premium_subscriptions existieren)
- [x] Stripe Price IDs in `premium_plans` Tabelle eingetragen
- [ ] **Edge Function Secrets im Supabase Dashboard gesetzt** (siehe SUPABASE-EDGE-FUNCTION-SECRETS.md)
- [ ] Edge Functions deployed

---

## SCHRITT 1: Edge Functions Deployen

```bash
# Alle Stripe-bezogenen Functions deployen
supabase functions deploy stripe-webhook
supabase functions deploy create-premium-checkout
supabase functions deploy cancel-premium-subscription
supabase functions deploy create-customer-portal-session
supabase functions deploy reactivate-premium-subscription
supabase functions deploy pause-subscription
supabase functions deploy resume-subscription
```

---

## SCHRITT 2: Stripe Webhook Im Dashboard Verifizieren

### 2.1 Webhook Endpoint prüfen
Gehe zu: https://dashboard.stripe.com/test/webhooks

**Erwarteter Endpoint:**
```
https://wyqrgdbifdhipwgtdvzy.supabase.co/functions/v1/stripe-webhook
```

### 2.2 Webhook Secret verifizieren
- Klicke auf den Webhook Endpoint
- Scrolle zu "Signing secret"
- Der angezeigte Wert sollte sein: `whsec_DN5EZXC8F1gqbWg5Y5T5induWBMhNi7D`
- **WICHTIG:** Dieser Wert MUSS als `STRIPE_WEBHOOK_SECRET` in Supabase gesetzt sein!

### 2.3 API Version prüfen
- Prüfe "API version" im Webhook: **2025-03-31.basil**
- Diese muss mit der Version in `stripe-webhook/index.ts` (Zeile 96) übereinstimmen

### 2.4 Events prüfen
Mindestens diese 12 Events sollten aktiviert sein:
- ✅ customer.subscription.created
- ✅ customer.subscription.updated
- ✅ customer.subscription.deleted
- ✅ customer.subscription.paused
- ✅ customer.subscription.resumed
- ✅ invoice.payment_succeeded
- ✅ invoice.payment_failed
- ✅ invoice.payment_action_required
- ✅ payment_intent.succeeded
- ✅ payment_intent.payment_failed
- ✅ identity.verification_session.created
- ✅ identity.verification_session.verified

---

## SCHRITT 3: Test-Webhook Senden (Smoke Test)

### 3.1 Im Stripe Dashboard
1. Gehe zu: https://dashboard.stripe.com/test/webhooks
2. Klicke auf deinen Webhook Endpoint
3. Klicke auf "Send test webhook"
4. Wähle Event: `customer.subscription.created`
5. Klicke "Send test webhook"

### 3.2 Erwartetes Ergebnis
**Status:** ✅ 200 OK

**Response:**
```json
{
  "received": true
}
```

### 3.3 Logs prüfen
Gehe zu: Supabase Dashboard → Edge Functions → stripe-webhook → Logs

**Erwartete Log-Einträge:**
```
[INFO] ======================================
[INFO] Incoming Stripe Webhook: customer.subscription.created
[INFO] ======================================
[INFO] Using main webhook secret: STRIPE_WEBHOOK_SECRET
[SUCCESS] ✓ Webhook signature verified successfully!
[HANDLER] Processing subscription update: sub_xxxxx
[SUCCESS] ======================================
[SUCCESS] Webhook processed successfully!
[SUCCESS] ======================================
```

---

## SCHRITT 4: End-to-End Premium Subscription Test

### 4.1 Test-User erstellen
```sql
-- Im Supabase SQL Editor
SELECT id, email FROM auth.users WHERE email = 'test@example.com';
```

Falls kein User existiert, registriere einen Test-User über die App.

### 4.2 Checkout Session erstellen

**Request an Edge Function:**
```javascript
const response = await fetch(
  'https://wyqrgdbifdhipwgtdvzy.supabase.co/functions/v1/create-premium-checkout',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer YOUR_ANON_KEY`
    },
    body: JSON.stringify({
      userId: 'USER_UUID_HERE',
      plan: 'monthly' // oder 'yearly'
    })
  }
);

const data = await response.json();
console.log(data);
// Erwartete Response: { sessionId: "cs_test_...", url: "https://checkout.stripe.com/..." }
```

### 4.3 Checkout durchführen
1. Öffne die `url` aus der Response im Browser
2. Fülle Checkout-Formular aus:
   - **Email:** Beliebig (Test-Modus)
   - **Card Number:** `4242 4242 4242 4242`
   - **Expiry:** Beliebiges zukünftiges Datum (z.B. 12/25)
   - **CVC:** Beliebig (z.B. 123)
   - **Name:** Beliebig
3. Klicke "Subscribe"

### 4.4 Webhook Events prüfen
Nach erfolgreicher Zahlung werden mehrere Webhooks ausgelöst:

1. **customer.subscription.created** oder **customer.subscription.updated**
2. **invoice.payment_succeeded**
3. **payment_intent.succeeded** (optional)

**Prüfe in Supabase:**
```sql
-- Premium Subscription prüfen
SELECT * FROM premium_subscriptions WHERE user_id = 'USER_UUID_HERE';

-- Erwartete Werte:
-- status = 'active' oder 'trialing'
-- stripe_subscription_id = 'sub_xxxxx'
-- stripe_customer_id = 'cus_xxxxx'
-- current_period_end > now()

-- Profile Premium Status prüfen
SELECT id, email, is_premium, premium_until FROM profiles WHERE id = 'USER_UUID_HERE';

-- Erwartete Werte:
-- is_premium = true
-- premium_until = current_period_end Datum
```

---

## SCHRITT 5: Premium Features Testen

### 5.1 Premium Status in der App prüfen
Logge dich mit dem Test-User ein und prüfe:
- ✅ Zeigt die App "Premium" Badge?
- ✅ Sind Premium-Features freigeschaltet?
- ✅ Werden Ads ausgeblendet?

### 5.2 Premium Status über API prüfen
```javascript
const { data } = await supabase
  .from('profiles')
  .select('is_premium, premium_until')
  .eq('id', userId)
  .single();

console.log('Is Premium:', data.is_premium);
console.log('Premium Until:', data.premium_until);
```

---

## SCHRITT 6: Subscription Management Testen

### 6.1 Customer Portal öffnen
```javascript
const response = await fetch(
  'https://wyqrgdbifdhipwgtdvzy.supabase.co/functions/v1/create-customer-portal-session',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer YOUR_ANON_KEY`
    },
    body: JSON.stringify({
      userId: 'USER_UUID_HERE',
      returnUrl: 'https://jetzz.app/profile'
    })
  }
);

const { url } = await response.json();
// Öffne url im Browser
```

### 6.2 Im Customer Portal testen
- ✅ Subscription Details anzeigen
- ✅ Plan ändern (Monthly ↔ Yearly)
- ✅ Subscription kündigen
- ✅ Zahlungsmethode ändern

### 6.3 Subscription Kündigung testen
1. Klicke "Cancel subscription" im Portal
2. Bestätige Kündigung
3. Prüfe Webhook: `customer.subscription.updated` mit `cancel_at_period_end = true`
4. Prüfe Datenbank:
```sql
SELECT
  status,
  cancel_at_period_end,
  current_period_end
FROM premium_subscriptions
WHERE user_id = 'USER_UUID_HERE';

-- Erwartete Werte:
-- status = 'active' (bleibt aktiv bis period_end)
-- cancel_at_period_end = true
-- current_period_end = Ablaufdatum
```

---

## SCHRITT 7: Fehlerfall-Tests

### 7.1 Payment Failed Test
1. Verwende Test Card: `4000 0000 0000 0341` (Declined Card)
2. Versuche Checkout
3. Erwartetes Ergebnis: Payment schlägt fehl
4. Prüfe Webhook: `invoice.payment_failed`
5. Prüfe Datenbank: `status = 'past_due'`

### 7.2 Invalid Webhook Secret Test
1. Temporär falsches Secret in Supabase setzen
2. Sende Test-Webhook
3. Erwartetes Ergebnis: 400 Bad Request, "Invalid signature"
4. Setze korrektes Secret zurück

---

## TROUBLESHOOTING

### Problem: "No signature" Error
**Lösung:**
- Webhook wird nicht von Stripe gesendet
- Prüfe Webhook URL in Stripe Dashboard
- Teste mit "Send test webhook" im Dashboard

### Problem: "Invalid signature" Error
**Lösung:**
- Webhook Secret stimmt nicht überein
- Prüfe `STRIPE_WEBHOOK_SECRET` in Supabase
- Vergleiche mit Signing Secret in Stripe Dashboard
- Deploye Edge Function neu nach Secret-Änderung

### Problem: Subscription wird nicht in DB gespeichert
**Lösung:**
- Prüfe Webhook Logs auf Fehler
- Prüfe RLS Policies auf `premium_subscriptions`
- Prüfe dass `user_id` in subscription metadata existiert

### Problem: is_premium Status wird nicht aktualisiert
**Lösung:**
- Prüfe Trigger `update_premium_status_trigger` existiert
- Prüfe Profile RLS Policies erlauben UPDATE
- Manuell testen:
```sql
SELECT update_profile_premium_status();
```

---

## SUCCESS CRITERIA

✅ **Alle Tests bestanden wenn:**

1. Test-Webhook returns 200 OK
2. Checkout Session kann erstellt werden
3. Test-Payment wird erfolgreich durchgeführt
4. `premium_subscriptions` Eintrag wird erstellt
5. `profiles.is_premium` wird auf `true` gesetzt
6. `profiles.premium_until` wird gesetzt
7. Customer Portal kann geöffnet werden
8. Subscription kann gekündigt werden
9. Webhook Logs zeigen keine Fehler

---

## NÄCHSTE SCHRITTE

Nach erfolgreichem Test:

1. **Produktiv-Modus vorbereiten:**
   - Stripe Live Keys bereitstellen
   - Live Webhook Endpoint konfigurieren
   - Live Price IDs in `premium_plans` updaten

2. **Frontend Integration:**
   - Premium Checkout Flow einbauen
   - Premium Badge/Status anzeigen
   - Premium-Only Features implementieren
   - Customer Portal Link einbauen

3. **Monitoring einrichten:**
   - Webhook Fehler-Alerts
   - Payment Failure Monitoring
   - Subscription Churn Tracking

---

**Dokumentation erstellt am:** 2025-12-07
**Für Projekt:** JETZZ App
**Supabase Projekt:** wyqrgdbifdhipwgtdvzy
