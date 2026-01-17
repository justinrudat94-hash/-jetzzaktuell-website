# Stripe Integration - Test-Anleitung

## Übersicht

Diese Anleitung hilft dir, die Stripe-Integration zu testen. Die folgenden Edge Functions wurden erfolgreich deployed:

1. **stripe-webhook** - Empfängt und verarbeitet Stripe Webhooks
2. **create-premium-checkout** - Erstellt Checkout-Sessions für Premium-Abos
3. **create-coin-checkout** - Erstellt Checkout-Sessions für Coin-Käufe
4. **create-customer-portal-session** - Erstellt Sessions für Stripe Customer Portal
5. **create-identity-verification** - Erstellt KYC/Identity Verification Sessions

---

## 1. Stripe Secrets in Supabase konfigurieren

Die folgenden Secrets müssen im Supabase Dashboard hinterlegt werden:

**Supabase Dashboard → Project Settings → Edge Functions → Secrets**

Füge diese Secrets hinzu:

```
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY_HERE

STRIPE_WEBHOOK_SECRET_PLATFORM=whsec_pPJGhonkC187MaG1kM4ADYc8QPfL6pV4

STRIPE_WEBHOOK_SECRET_IDENTITY=whsec_wVfLwCqVqYmzAGfdDCd63mC1Ig2qbT64

STRIPE_PRICE_ID_MONTHLY=price_1SaHW8CFeiVVSQ6T5Eza5apV

STRIPE_PRICE_ID_YEARLY=price_1SaHZQCFeiVVSQ6TaBRwkWlO

OPENAI_API_KEY=sk-your_openai_api_key_here

RESEND_API_KEY=re_your_resend_api_key_here
```

**Wichtig:** Ersetze die API-Keys für OpenAI und Resend mit deinen echten Werten, falls du diese Services nutzen möchtest.

---

## 2. Stripe Webhooks konfigurieren

### Webhook-Endpoint URL ermitteln

Deine Stripe Webhook URL ist:
```
https://vhhfztpijdemocghpwqj.supabase.co/functions/v1/stripe-webhook
```

### Im Stripe Dashboard konfigurieren

1. Gehe zu [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Klicke auf "Add endpoint"

#### Für Platform Webhooks (Standard):
- **Endpoint URL**: `https://vhhfztpijdemocghpwqj.supabase.co/functions/v1/stripe-webhook`
- **Events to send**: Wähle folgende Events aus:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.paused`
  - `customer.subscription.resumed`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `invoice.payment_action_required`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `account.updated`
  - `payout.paid`
  - `payout.failed`

3. Speichere den Endpoint
4. Kopiere das **Signing secret** (beginnt mit `whsec_`)
5. Ersetze `STRIPE_WEBHOOK_SECRET_PLATFORM` in Supabase mit diesem Wert

#### Für Identity Webhooks (KYC):
- **Endpoint URL**: `https://vhhfztpijdemocghpwqj.supabase.co/functions/v1/stripe-webhook`
- **Events to send**: Wähle folgende Events aus:
  - `identity.verification_session.created`
  - `identity.verification_session.verified`
  - `identity.verification_session.requires_input`

6. Speichere den Endpoint
7. Kopiere das **Signing secret**
8. Ersetze `STRIPE_WEBHOOK_SECRET_IDENTITY` in Supabase mit diesem Wert

---

## 3. Test-Szenarien

### Test 1: Premium-Abo kaufen (Monatlich)

1. **In der App**: Navigiere zum Premium-Bereich
2. Wähle "Monatliches Abo" aus
3. Du wirst zu Stripe Checkout weitergeleitet
4. Nutze Stripe Test-Kartennummer: `4242 4242 4242 4242`
   - Ablaufdatum: Beliebiges Datum in der Zukunft
   - CVC: Beliebige 3 Ziffern
   - PLZ: Beliebige Postleitzahl
5. Schließe die Zahlung ab

**Erwartetes Ergebnis:**
- Zahlung erfolgreich
- Webhook `checkout.session.completed` wird empfangen
- Webhook `customer.subscription.created` wird empfangen
- Premium-Status wird in der Datenbank gespeichert (`premium_subscriptions` Tabelle)
- Du wirst zur Success-URL weitergeleitet

### Test 2: Coins kaufen

1. **In der App**: Navigiere zum Rewards/Coins-Bereich
2. Wähle ein Coin-Paket aus (z.B. 100 Coins)
3. Du wirst zu Stripe Checkout weitergeleitet
4. Nutze die Test-Kartennummer wie oben
5. Schließe die Zahlung ab

**Erwartetes Ergebnis:**
- Zahlung erfolgreich
- Webhook `checkout.session.completed` wird empfangen
- Coins werden dem User-Account gutgeschrieben (`user_stats.coins`)
- Transaktion wird in `reward_transactions` gespeichert
- Du wirst zur Success-URL weitergeleitet

### Test 3: Webhook manuell testen

Du kannst Webhooks direkt im Stripe Dashboard testen:

1. Gehe zu [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Klicke auf deinen Webhook-Endpoint
3. Klicke auf "Send test webhook"
4. Wähle ein Event aus (z.B. `checkout.session.completed`)
5. Klicke auf "Send test webhook"

**Erwartetes Ergebnis:**
- Status 200 OK
- In Supabase Logs siehst du die Verarbeitung

### Test 4: Abo-Verwaltung im Customer Portal

1. **In der App**: Navigiere zu Profil → Einstellungen → Abo verwalten
2. Du wirst zum Stripe Customer Portal weitergeleitet
3. Teste folgende Aktionen:
   - Abo kündigen
   - Zahlungsmethode ändern
   - Rechnungen ansehen

**Erwartetes Ergebnis:**
- Customer Portal öffnet sich
- Änderungen werden über Webhooks zurückgemeldet
- Status in der Datenbank wird aktualisiert

### Test 5: KYC/Identity Verification

1. **In der App**: Navigiere zum KYC-Bereich
2. Starte die Verifizierung
3. Du wirst zu Stripe Identity weitergeleitet
4. Führe den Verifizierungsprozess durch (im Test-Modus kannst du Test-Dokumente verwenden)

**Erwartetes Ergebnis:**
- Verification Session wird erstellt
- Status wird in `profiles.kyc_verification_status` gespeichert
- Nach erfolgreicher Verifizierung: Webhook `identity.verification_session.verified`
- Status wechselt zu "verified"

---

## 4. Logs überprüfen

### Supabase Logs

1. Gehe zu Supabase Dashboard → Edge Functions → Logs
2. Wähle die jeweilige Function aus
3. Überprüfe die Logs auf Fehler

### Stripe Logs

1. Gehe zu [Stripe Dashboard → Developers → Logs](https://dashboard.stripe.com/test/logs)
2. Überprüfe alle API-Requests
3. Überprüfe Webhook-Delivery Status

---

## 5. Fehlerbehebung

### Webhook wird nicht empfangen

**Prüfe:**
- Ist der Webhook-Endpoint im Stripe Dashboard korrekt konfiguriert?
- Ist das Signing Secret korrekt in Supabase hinterlegt?
- Überprüfe Supabase Edge Function Logs

**Lösung:**
```bash
# Secrets in Supabase nochmal setzen
# Dashboard → Project Settings → Edge Functions → Secrets
```

### "Invalid signature" Fehler

**Problem:** Das Webhook Secret stimmt nicht überein

**Lösung:**
1. Gehe zu Stripe Dashboard → Webhooks
2. Klicke auf deinen Endpoint
3. Kopiere das Signing Secret neu
4. Update das Secret in Supabase (`STRIPE_WEBHOOK_SECRET_PLATFORM` oder `STRIPE_WEBHOOK_SECRET_IDENTITY`)

### Zahlung erfolgreich, aber keine Coins/Abo

**Prüfe:**
- Wurde der Webhook empfangen? (Stripe Dashboard → Webhooks)
- Gibt es Fehler in den Supabase Logs?
- Ist die Datenbank-Policy korrekt? (RLS)

**Lösung:**
```sql
-- Prüfe ob Webhook verarbeitet wurde
SELECT * FROM premium_subscriptions WHERE user_id = 'USER_ID';
SELECT * FROM user_stats WHERE user_id = 'USER_ID';
```

### Test-Karten funktionieren nicht

**Stripe Test-Karten:**
- Erfolgreiche Zahlung: `4242 4242 4242 4242`
- 3D Secure erforderlich: `4000 0027 6000 3184`
- Zahlung fehlgeschlagen: `4000 0000 0000 0002`

Siehe: https://stripe.com/docs/testing

---

## 6. Produktiv-Umgebung

Für den Produktiv-Betrieb:

1. **Stripe Keys ersetzen:**
   - Ersetze `sk_test_...` durch `sk_live_...`
   - Ersetze `pk_test_...` durch `pk_live_...`

2. **Neue Webhooks erstellen:**
   - Im Live-Modus neue Webhook-Endpoints erstellen
   - Neue Signing Secrets in Supabase hinterlegen

3. **Price IDs aktualisieren:**
   - Erstelle Live Price IDs in Stripe
   - Update `STRIPE_PRICE_ID_MONTHLY` und `STRIPE_PRICE_ID_YEARLY`

---

## 7. Weitere Stripe Features (Optional)

Die Integration unterstützt auch:

- **Dunning Management**: Automatische Mahnungen bei fehlgeschlagenen Zahlungen
- **Payment Retry**: Automatische Wiederholungsversuche
- **Subscription Pausing**: Abo pausieren statt kündigen
- **Ticket-Verkauf**: Stripe für Event-Tickets nutzen
- **Payouts**: Creator-Auszahlungen über Stripe Connect

---

## Support

Bei Fragen oder Problemen:
- Stripe Dokumentation: https://stripe.com/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Stripe Testing: https://stripe.com/docs/testing
