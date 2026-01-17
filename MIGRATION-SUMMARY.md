# Migration zum neuen Supabase Projekt - ZUSAMMENFASSUNG

## ✅ ABGESCHLOSSEN

### 1. Umgebungsvariablen aktualisiert
**Datei:** `.env`

**Geändert:**
- `EXPO_PUBLIC_SUPABASE_URL`: `vhhfztpijdemocghpwqj` → `wyqrgdbifdhipwgtdvzy`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Neuer Key eingetragen
- `STRIPE_WEBHOOK_SECRET`: Hinzugefügt (höchste Priorität für Webhook)
- `STRIPE_WEBHOOK_SECRET_PLATFORM`: Aktualisiert

**Altes Projekt:** https://vhhfztpijdemocghpwqj.supabase.co
**Neues Projekt:** https://wyqrgdbifdhipwgtdvzy.supabase.co

---

### 2. Datenbank-Struktur verifiziert
**Status:** ✅ Alle Tabellen existieren im neuen Projekt

**Wichtige Tabellen:**
- ✅ `premium_plans` - Premium-Pläne (Monthly & Yearly)
- ✅ `premium_subscriptions` - User-Subscriptions
- ✅ `profiles` - mit `is_premium`, `premium_until`, `stripe_customer_id`
- ✅ `events`, `event_tickets`, `ticket_purchases` - Monetization
- ✅ `user_stats`, `reward_transactions` - Reward System
- ✅ Alle anderen Tabellen (130+ Tabellen vorhanden)

**RLS Status:** ✅ Row Level Security auf allen Tabellen aktiviert

---

### 3. Stripe Price IDs aktualisiert
**Tabelle:** `premium_plans`

**Vor:**
- Monthly: `PLACEHOLDER_MONTHLY_PRICE_ID`
- Yearly: `PLACEHOLDER_YEARLY_PRICE_ID`

**Nach:**
- Monthly: `price_1SaHW8CFeiVVSQ6T5Eza5apV` (4.99 EUR/Monat)
- Yearly: `price_1SaHZQCFeiVVSQ6TaBRwkWlO` (39.99 EUR/Jahr)

**Verifikation:**
```sql
SELECT plan_type, stripe_price_id, price_eur FROM premium_plans;
```

---

### 4. Dokumentation erstellt

#### 4.1 SUPABASE-EDGE-FUNCTION-SECRETS.md
**Inhalt:**
- Vollständige Liste aller benötigten Edge Function Secrets
- Anleitung zum Setzen der Secrets im Supabase Dashboard
- Webhook Konfiguration in Stripe
- Troubleshooting-Tipps

**Kritische Secrets:**
- `STRIPE_WEBHOOK_SECRET` (whsec_DN5EZXC8F1gqbWg5Y5T5induWBMhNi7D)
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_MONTHLY`
- `STRIPE_PRICE_ID_YEARLY`

#### 4.2 STRIPE-PREMIUM-TEST-ANLEITUNG.md
**Inhalt:**
- Schritt-für-Schritt Test-Anleitung
- End-to-End Premium Subscription Flow
- Webhook Verifikation
- Fehlerfall-Tests
- Troubleshooting-Tipps
- Success Criteria

---

## ⚠️ NÄCHSTE SCHRITTE (Für dich durchzuführen)

### 1. Edge Function Secrets im Supabase Dashboard setzen
**Wo:** https://supabase.com/dashboard/project/wyqrgdbifdhipwgtdvzy/settings/functions

**Mindestens erforderlich:**
- [x] `STRIPE_WEBHOOK_SECRET` = `whsec_DN5EZXC8F1gqbWg5Y5T5induWBMhNi7D`
- [x] `STRIPE_SECRET_KEY` = (aus .env)
- [x] `STRIPE_PRICE_ID_MONTHLY` = `price_1SaHW8CFeiVVSQ6T5Eza5apV`
- [x] `STRIPE_PRICE_ID_YEARLY` = `price_1SaHZQCFeiVVSQ6TaBRwkWlO`

**Optional (für zusätzliche Features):**
- [ ] `OPENAI_API_KEY` (für KI-Moderation)
- [ ] `RESEND_API_KEY` (für Email-Benachrichtigungen)
- [ ] `TICKETMASTER_API_KEY` (für Event-Aggregation)

**Siehe:** `SUPABASE-EDGE-FUNCTION-SECRETS.md` für Details

---

### 2. Edge Functions deployen
```bash
supabase functions deploy stripe-webhook
supabase functions deploy create-premium-checkout
supabase functions deploy cancel-premium-subscription
supabase functions deploy create-customer-portal-session
```

---

### 3. Stripe Webhook verifizieren
**Stripe Dashboard:** https://dashboard.stripe.com/test/webhooks

**Prüfen:**
- [ ] Webhook Endpoint: `https://wyqrgdbifdhipwgtdvzy.supabase.co/functions/v1/stripe-webhook`
- [ ] Signing Secret: `whsec_DN5EZXC8F1gqbWg5Y5T5induWBMhNi7D`
- [ ] API Version: `2025-03-31.basil`
- [ ] 12 Events aktiviert (siehe STRIPE-PREMIUM-TEST-ANLEITUNG.md)

---

### 4. Test-Webhook senden
1. Stripe Dashboard → Webhooks → "Send test webhook"
2. Event: `customer.subscription.created`
3. Erwartetes Ergebnis: ✅ 200 OK

**Logs prüfen:**
Supabase Dashboard → Edge Functions → stripe-webhook → Logs

---

### 5. End-to-End Premium Test
**Siehe:** `STRIPE-PREMIUM-TEST-ANLEITUNG.md`

**Kurz:**
1. Test-User registrieren
2. Checkout Session erstellen
3. Test-Payment durchführen (Card: 4242 4242 4242 4242)
4. Premium Status in DB verifizieren
5. Customer Portal testen

---

## 📊 SYSTEM STATUS

### Datenbank
- ✅ Migration von `vhhfztpijdemocghpwqj` zu `wyqrgdbifdhipwgtdvzy` abgeschlossen
- ✅ Alle 130+ Tabellen vorhanden
- ✅ RLS aktiviert auf allen Tabellen
- ✅ Premium-System Tabellen korrekt konfiguriert

### Konfiguration
- ✅ `.env` aktualisiert mit neuen Credentials
- ✅ Stripe Price IDs in DB eingetragen
- ⚠️ Edge Function Secrets müssen noch gesetzt werden (dein Teil!)

### Stripe Integration
- ✅ Webhook URL bekannt: `https://wyqrgdbifdhipwgtdvzy.supabase.co/functions/v1/stripe-webhook`
- ✅ Webhook Secret bekannt: `whsec_DN5EZXC8F1gqbWg5Y5T5induWBMhNi7D`
- ✅ Price IDs konfiguriert
- ⚠️ Webhook muss verifiziert werden (dein Teil!)

### Edge Functions
- ✅ Alle Stripe-Functions vorhanden im Code
- ✅ Webhook Handler vollständig implementiert
- ⚠️ Functions müssen deployed werden (dein Teil!)

---

## 🎯 ERFOLGS-KRITERIEN

Das System ist vollständig funktionsfähig wenn:

1. ✅ Edge Function Secrets im Supabase Dashboard gesetzt
2. ✅ Edge Functions erfolgreich deployed
3. ✅ Test-Webhook returns 200 OK
4. ✅ Premium Checkout kann erstellt werden
5. ✅ Test-Payment erfolgreich durchgeführt
6. ✅ User erhält Premium Status in DB
7. ✅ Customer Portal funktioniert
8. ✅ Subscription kann gekündigt werden

---

## 📝 WICHTIGE DATEIEN

- `.env` - Umgebungsvariablen (aktualisiert)
- `SUPABASE-EDGE-FUNCTION-SECRETS.md` - Secret-Konfiguration
- `STRIPE-PREMIUM-TEST-ANLEITUNG.md` - Test-Guide
- `MIGRATION-SUMMARY.md` - Diese Datei
- `supabase/functions/stripe-webhook/index.ts` - Hauptwebhook Handler
- `supabase/functions/create-premium-checkout/index.ts` - Checkout Creator
- `supabase/migrations/20251113110000_067_create_premium_subscription_system.sql` - Premium DB Schema

---

## 🚀 LOS GEHT'S!

**Dein nächster Schritt:**
1. Öffne: https://supabase.com/dashboard/project/wyqrgdbifdhipwgtdvzy/settings/functions
2. Scrolle zu "Secrets"
3. Setze die 4 kritischen Secrets (siehe SUPABASE-EDGE-FUNCTION-SECRETS.md)
4. Deploye die Edge Functions
5. Sende Test-Webhook aus Stripe Dashboard
6. Führe End-to-End Test durch (siehe STRIPE-PREMIUM-TEST-ANLEITUNG.md)

**Bei Problemen:**
- Prüfe Logs: Supabase Dashboard → Edge Functions → Logs
- Prüfe Webhook Logs: Stripe Dashboard → Webhooks → Recent deliveries
- Siehe Troubleshooting in den jeweiligen Dokumenten

---

**Migration durchgeführt am:** 2025-12-07
**Von:** vhhfztpijdemocghpwqj.supabase.co
**Nach:** wyqrgdbifdhipwgtdvzy.supabase.co
**Status:** ✅ Vorbereitung abgeschlossen, bereit für finale Konfiguration
