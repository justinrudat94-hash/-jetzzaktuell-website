# Supabase Edge Function Secrets Configuration

## WICHTIG: Diese Secrets MÜSSEN im Supabase Dashboard konfiguriert werden!

Gehe zu: **Supabase Dashboard → Project Settings → Edge Functions → Secrets**

---

## KRITISCHE SECRETS (Für Stripe Premium System)

### 1. STRIPE_WEBHOOK_SECRET (HÖCHSTE PRIORITÄT!)
```
whsec_DN5EZXC8F1gqbWg5Y5T5induWBMhNi7D
```
**Beschreibung:** Hauptwebhook Secret für die stripe-webhook Edge Function
**Verwendet von:** `stripe-webhook/index.ts` (Zeile 39 - höchste Priorität)

### 2. STRIPE_SECRET_KEY
```
sk_test_YOUR_STRIPE_SECRET_KEY_HERE
```
**Beschreibung:** Stripe Secret Key für API-Aufrufe
**Verwendet von:** Alle Stripe-bezogenen Edge Functions

### 3. STRIPE_PRICE_ID_MONTHLY
```
price_1SaHW8CFeiVVSQ6T5Eza5apV
```
**Beschreibung:** Stripe Price ID für monatliches Premium-Abo (4.99 EUR)
**Verwendet von:** `create-premium-checkout/index.ts`

### 4. STRIPE_PRICE_ID_YEARLY
```
price_1SaHZQCFeiVVSQ6TaBRwkWlO
```
**Beschreibung:** Stripe Price ID für jährliches Premium-Abo (39.99 EUR)
**Verwendet von:** `create-premium-checkout/index.ts`

---

## AUTOMATISCH VERFÜGBARE SECRETS (Bereits von Supabase gesetzt)

Diese Secrets werden automatisch von Supabase bereitgestellt und müssen NICHT manuell gesetzt werden:

- `SUPABASE_URL` - Deine Projekt-URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service Role Key für Backend-Operationen
- `SUPABASE_ANON_KEY` - Anon Key (optional, meist nicht in Edge Functions benötigt)

---

## WICHTIGE SECRETS (Für App-Funktionalität)

### Website URL für Magic Links
```
EXPO_PUBLIC_APP_URL=https://app.jetzzapp.com
```
**Beschreibung:** URL der Landing Page Website für Magic Links in E-Mails
**Verwendet von:** `send-ticket-email/index.ts` - Generiert Magic Links für Support-Tickets
**WICHTIG:** Diese URL muss auf die Website zeigen, nicht auf die mobile App!

---

## OPTIONALE SECRETS (Für zusätzliche Features)

### KI-Moderation
```
OPENAI_API_KEY=sk-your_openai_api_key_here
```
**Verwendet von:** `moderate-content`, `moderate-profile-picture`, `moderate-comment`

### Email-Benachrichtigungen
```
RESEND_API_KEY=re_your_resend_api_key_here
```
**Verwendet von:** `send-email-notification`, `process-dunning-cases`

### Event-Aggregation
```
TICKETMASTER_API_KEY=y0PHGhKdCgQgqZFIFjnU8ZXPOgGqTkxT
EVENTBRITE_PRIVATE_TOKEN=PLDZQIF6Z743PZN63TVA
```
**Verwendet von:** `fetch-ticketmaster-events`, Eventbrite-Integration

---

## WEBHOOK KONFIGURATION IN STRIPE

### Webhook Endpoint
```
https://wyqrgdbifdhipwgtdvzy.supabase.co/functions/v1/stripe-webhook
```

### API Version
```
2025-03-31.basil
```
**WICHTIG:** Diese API Version muss mit der Version in `stripe-webhook/index.ts` übereinstimmen!

### Events, die abonniert werden sollten (12 Events):

#### Subscription Events
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`
- `customer.subscription.resumed`

#### Invoice Events
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `invoice.payment_action_required`

#### Payment Events
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

#### Identity Verification Events
- `identity.verification_session.created`
- `identity.verification_session.verified`
- `identity.verification_session.requires_input`

#### Account Events (Optional)
- `account.updated`

#### Payout Events (Optional)
- `payout.paid`
- `payout.failed`

---

## SO SETZT DU DIE SECRETS:

### Methode 1: Im Supabase Dashboard (Empfohlen)
1. Öffne: https://supabase.com/dashboard/project/wyqrgdbifdhipwgtdvzy/settings/functions
2. Scrolle zu "Secrets"
3. Klicke auf "Add new secret"
4. Name eingeben (z.B. `STRIPE_WEBHOOK_SECRET`)
5. Value einfügen
6. Speichern

### Methode 2: Über Supabase CLI (Fortgeschritten)
```bash
# Einzelnes Secret setzen
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_DN5EZXC8F1gqbWg5Y5T5induWBMhNi7D

# Alle Secrets auf einmal aus .env Datei
supabase secrets set --env-file .env
```

---

## WICHTIGE HINWEISE:

1. **Webhook Secret ist KRITISCH:** Ohne das korrekte `STRIPE_WEBHOOK_SECRET` werden alle Stripe Webhooks fehlschlagen!

2. **Secret Namen müssen EXAKT übereinstimmen:** Die Edge Functions suchen nach exakten Namen wie `STRIPE_WEBHOOK_SECRET`, nicht `WEBHOOK_SECRET` oder `STRIPE_SECRET`

3. **Nach dem Setzen deployen:** Nach dem Setzen der Secrets müssen die Edge Functions neu deployed werden:
   ```bash
   supabase functions deploy stripe-webhook
   supabase functions deploy create-premium-checkout
   ```

4. **Testen:** Teste das Webhook nach der Konfiguration mit einem Test-Event aus dem Stripe Dashboard

---

## VERIFIKATION:

So überprüfst du, ob die Secrets korrekt gesetzt sind:

1. **Im Supabase Dashboard:**
   - Gehe zu Edge Functions → stripe-webhook → Logs
   - Löse ein Test-Webhook aus
   - Prüfe Logs auf "Using STRIPE_WEBHOOK_SECRET" oder Fehler

2. **Test-Webhook senden:**
   - Stripe Dashboard → Webhooks → Test webhook
   - Sende ein `customer.subscription.created` Event
   - Status sollte 200 sein

3. **Edge Function Logs prüfen:**
   ```
   [INFO] Using main webhook secret: STRIPE_WEBHOOK_SECRET
   [SUCCESS] ✓ Webhook signature verified successfully!
   [SUCCESS] Webhook processed successfully!
   ```

---

## TROUBLESHOOTING:

### "No signature" Error
- Webhook Secret wurde nicht als Header mitgesendet
- Prüfe Stripe Dashboard Webhook Konfiguration

### "Invalid signature" Error
- Webhook Secret stimmt nicht überein
- Prüfe ob `STRIPE_WEBHOOK_SECRET` im Dashboard gesetzt ist
- Prüfe ob das Secret mit dem Signing Secret aus Stripe übereinstimmt

### "Webhook secret not configured" Error
- Secret wurde nicht im Supabase Dashboard gesetzt
- Edge Function muss nach Secret-Änderung neu deployed werden

---

## STATUS:

✅ `.env` Datei aktualisiert mit neuen Supabase Credentials
✅ Datenbank-Migrationen bereits angewendet
✅ `premium_plans` Tabelle mit echten Stripe Price IDs aktualisiert
⚠️ Edge Function Secrets müssen noch im Supabase Dashboard gesetzt werden
⚠️ Stripe Webhook muss verifiziert werden
⚠️ End-to-End Test steht noch aus
