# 🚀 STRIPE BILLING & INKASSO - IMPLEMENTATION ROADMAP

## ✅ FERTIGGESTELLT (100% komplett)

### Datenbank (6 Migrationen)
- [x] 099_extend_profiles_billing_data - Vollständige Billing-Daten
- [x] 100_extend_premium_subscriptions - Trial, Pause, Amount tracking
- [x] 101_create_payment_retry_log - Zahlungswiederholungs-Tracking
- [x] 102_create_dunning_system - 3-stufiges Mahnsystem
- [x] 103_create_collection_system - Inkasso-Management
- [x] 104_create_tracking_tables - Invoice & Audit Trail

### Services (3 Services)
- [x] premiumService.ts - Subscription Management
- [x] dunningService.ts - Mahnwesen
- [x] collectionService.ts - Inkasso

### UI-Komponenten (3 Komponenten)
- [x] CompleteProfileModal.tsx - Billing-Datenerfassung
- [x] PastDueWarningBanner.tsx - Zahlungsrückstand-Warnung
- [x] PaymentCollectionsAdmin.tsx - Admin Inkasso-Übersicht

---

## 🔴 PHASE 1: STRIPE KONFIGURATION (KRITISCH - 30 Min)

### Task 1.1: Stripe Keys eintragen
**Dateien:** `.env`

**Aktuelle Keys aus Screenshot:**
```env
STRIPE_PUBLISHABLE_KEY=pk_test_51REQzoFyhi14zigFdQb1nMasoQb0ckJPaGob3bkdZ68BrCr8U...
STRIPE_SECRET_KEY=sk_test_... (aus Stripe Dashboard kopieren)
```

**Schritte:**
1. Öffne Stripe Dashboard → Developers → API keys
2. Kopiere den vollständigen Secret Key (sk_test_...)
3. Ersetze in `.env` Zeilen 32-33
4. Speichern

**Wichtig:** Diese Keys auch in Supabase Edge Functions Secrets eintragen:
- Supabase Dashboard → Project Settings → Edge Functions → Secrets
- Add Secret: `STRIPE_SECRET_KEY` = `sk_test_...`
- Add Secret: `STRIPE_PUBLISHABLE_KEY` = `pk_test_...`

---

### Task 1.2: Stripe Produkte erstellen
**Wo:** Stripe Dashboard → Products

**Produkt 1: Premium Monthly**
- Name: "Premium Monatlich"
- Preis: 4,99 €
- Billing: Recurring - Monthly
- Trial: 7 days
- Currency: EUR
- **Wichtig:** Price ID kopieren (z.B. `price_abc123`)

**Produkt 2: Premium Yearly**
- Name: "Premium Jährlich"
- Preis: 49,99 €
- Billing: Recurring - Yearly
- Trial: 7 days
- Currency: EUR
- **Wichtig:** Price ID kopieren (z.B. `price_xyz789`)

**Notiere:**
```
STRIPE_PRICE_MONTHLY=price_abc123
STRIPE_PRICE_YEARLY=price_xyz789
```

---

### Task 1.3: Stripe Smart Retries aktivieren
**Wo:** Stripe Dashboard → Settings → Billing → Automatic collection

**Einstellungen:**
- ✅ Enable automatic retries
- Retry schedule:
  - Day 3 after failure
  - Day 5 after failure
  - Day 7 after failure
  - Day 14 after failure
- Email customers on failed payment: ✅ Enabled

---

### Task 1.4: Stripe Webhook konfigurieren
**Wo:** Stripe Dashboard → Developers → Webhooks

**Webhook Endpoint hinzufügen:**
```
URL: https://vhhfztpijdemocghpwqj.supabase.co/functions/v1/stripe-webhook
```

**Events auswählen:**
```
✅ checkout.session.completed
✅ customer.subscription.created
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ customer.subscription.paused
✅ customer.subscription.resumed
✅ invoice.created
✅ invoice.paid
✅ invoice.payment_failed
✅ invoice.payment_action_required
✅ payment_intent.succeeded
✅ payment_intent.payment_failed
```

**Signing Secret kopieren:**
Nach Erstellen des Webhooks → "Signing secret" → Kopieren
Notiere: `whsec_...`

**In Supabase Edge Functions Secrets eintragen:**
- Secret Name: `STRIPE_WEBHOOK_SECRET`
- Value: `whsec_...`

---

## 🟡 PHASE 2: EDGE FUNCTIONS (KRITISCH - 2-3 Stunden)

### Task 2.1: create-premium-checkout Edge Function
**Datei:** `supabase/functions/create-premium-checkout/index.ts`

**Funktionalität:**
- Prüft billing_data_complete
- Erstellt/holt Stripe Customer
- Erstellt Checkout Session mit 7-day trial
- Speichert metadata für späteren Webhook

**Status:** ⚠️ Noch nicht erstellt

**Priority:** 🔴 KRITISCH - Ohne diese Function kein Premium-Abo möglich

---

### Task 2.2: stripe-webhook Edge Function erweitern
**Datei:** `supabase/functions/stripe-webhook/index.ts`

**Funktionalität erweitern:**
- Webhook Signature Validation
- Event Handling für alle Events
- Sync premium_subscriptions
- Erstelle stripe_invoices
- Erstelle payment_retry_log bei Failures
- Starte dunning_cases nach 4. Failure
- Update subscription_audit_log

**Status:** ⚠️ Existiert bereits, muss erweitert werden

**Priority:** 🔴 KRITISCH - Ohne Webhooks keine Sync mit Stripe

---

### Task 2.3: pause-subscription Edge Function
**Datei:** `supabase/functions/pause-subscription/index.ts`

**Funktionalität:**
- Pausiert Stripe Subscription
- Update premium_subscriptions (is_paused = true)
- Sende E-Mail-Benachrichtigung

**Status:** ⚠️ Noch nicht erstellt

**Priority:** 🟡 WICHTIG - Feature für User

---

### Task 2.4: resume-subscription Edge Function
**Datei:** `supabase/functions/resume-subscription/index.ts`

**Funktionalität:**
- Reaktiviert Stripe Subscription
- Update premium_subscriptions (is_paused = false)
- Sende E-Mail-Benachrichtigung

**Status:** ⚠️ Noch nicht erstellt

**Priority:** 🟡 WICHTIG - Feature für User

---

### Task 2.5: generate-dunning-letter Edge Function
**Datei:** `supabase/functions/generate-dunning-letter/index.ts`

**Funktionalität:**
- Generiert PDF-Mahnschreiben
- Speichert in Supabase Storage
- Erstellt dunning_letters Eintrag
- Versendet per E-Mail

**Status:** ⚠️ Noch nicht erstellt

**Priority:** 🟢 OPTIONAL - Kann später implementiert werden

**Alternative:** Einfaches Text-E-Mail statt PDF (schneller zu implementieren)

---

### Task 2.6: export-to-collection-agency Edge Function
**Datei:** `supabase/functions/export-to-collection-agency/index.ts`

**Funktionalität:**
- Generiert ZIP mit allen Dokumenten
- Speichert in Supabase Storage
- Erstellt collection_exports Eintrag

**Status:** ⚠️ Noch nicht erstellt

**Priority:** 🟢 OPTIONAL - Manueller Download reicht zunächst

---

## 🟢 PHASE 3: UI-KOMPONENTEN (WICHTIG - 2-3 Stunden)

### Task 3.1: PremiumUpgradeModal.tsx
**Datei:** `components/PremiumUpgradeModal.tsx`

**Features:**
- Plan-Auswahl (Monthly/Yearly)
- 7-Tage-Trial Hinweis prominent
- Preisvergleich & Ersparnis
- Prüft billing_data_complete
- Zeigt CompleteProfileModal falls nötig
- Ruft create-premium-checkout auf

**Status:** ⚠️ Noch nicht erstellt

**Priority:** 🟡 WICHTIG - Ohne Modal können User nicht upgraden

---

### Task 3.2: SubscriptionManagement.tsx
**Datei:** `components/SubscriptionManagement.tsx`

**Features:**
- Aktueller Plan & Status anzeigen
- Nächste Zahlung & Betrag
- Zahlungshistorie
- Pause-Button
- Kündigungs-Button
- Link zu Stripe Customer Portal

**Status:** ⚠️ Noch nicht erstellt

**Priority:** 🟢 OPTIONAL - Nice-to-have für User

---

### Task 3.3: PaymentRequiredPage.tsx
**Datei:** `app/payment-required.tsx`

**Features:**
- Zeigt offenen Betrag
- Countdown bis nächste Mahnstufe
- "Jetzt bezahlen"-Button
- Link zu Stripe Portal

**Status:** ⚠️ Noch nicht erstellt

**Priority:** 🟡 WICHTIG - Wird von PastDueWarningBanner aufgerufen

---

## 🔗 PHASE 4: INTEGRATION (WICHTIG - 1-2 Stunden)

### Task 4.1: Event-Erstellung blockieren bei past_due
**Datei:** `app/(tabs)/create.tsx`

**Code hinzufügen:**
```typescript
useEffect(() => {
  const checkStatus = async () => {
    const status = await premiumService.getSubscriptionStatus(user.id);
    if (status.isPremium && status.isPastDue) {
      setCanCreateEvent(false);
      // Zeige Warnung
    }
  };
  checkStatus();
}, [user]);
```

**Status:** ⚠️ Noch nicht implementiert

**Priority:** 🔴 KRITISCH - Kern-Geschäftslogik

---

### Task 4.2: CompleteProfileModal in Payment-Flows einbinden
**Dateien:**
- `components/PremiumUpgradeModal.tsx` (neu)
- `components/CoinPurchaseModal.tsx` (existiert)
- Alle anderen Payment-Flows

**Code-Pattern:**
```typescript
const handlePurchase = async () => {
  if (!profile?.billing_data_complete) {
    setShowCompleteProfileModal(true);
    return;
  }
  // Weiter zum Checkout
};
```

**Status:** ⚠️ Noch nicht implementiert

**Priority:** 🔴 KRITISCH - Stripe Compliance

---

### Task 4.3: PastDueWarningBanner in App-Layout einbinden
**Datei:** `app/_layout.tsx`

**Code hinzufügen:**
```typescript
import PastDueWarningBanner from '@/components/PastDueWarningBanner';

export default function RootLayout() {
  return (
    <>
      <PastDueWarningBanner />
      <Stack>...</Stack>
    </>
  );
}
```

**Status:** ⚠️ Noch nicht implementiert

**Priority:** 🟡 WICHTIG - User-Kommunikation

---

## 📧 PHASE 5: E-MAIL SERVICE (OPTIONAL - 2-3 Stunden)

### Task 5.1: Resend API konfigurieren
**Wo:** https://resend.com

**Schritte:**
1. Account erstellen
2. Domain verifizieren (oder test domain nutzen)
3. API Key erstellen
4. In `.env` eintragen: `RESEND_API_KEY=re_...`
5. In Supabase Secrets eintragen

**Status:** ⚠️ API Key fehlt noch

**Priority:** 🟢 OPTIONAL - Kann zunächst ohne E-Mails laufen

---

### Task 5.2: E-Mail Templates erstellen
**Benötigt:**
1. Premium-Willkommen
2. Trial-endet-bald (2 Tage vorher)
3. Zahlung-erfolgreich
4. Zahlung-fehlgeschlagen
5. 1. Mahnung
6. 2. Mahnung
7. 3. Mahnung (mit Inkasso-Androhung)
8. Abo-pausiert / reaktiviert

**Status:** ⚠️ Noch nicht erstellt

**Priority:** 🟢 OPTIONAL - Später implementieren

---

## 🧪 PHASE 6: TESTING (WICHTIG - 2-3 Stunden)

### Task 6.1: Stripe Test Mode Testing
**Test-Karten:**
- Erfolg: `4242 4242 4242 4242`
- Fehlschlag: `4000 0000 0000 9995`
- Requires authentication: `4000 0025 0000 3155`

**Tests:**
- [ ] Checkout Flow mit Erfolg
- [ ] Checkout Flow mit Fehlschlag
- [ ] Trial-Periode beobachten
- [ ] Webhook Events kommen an
- [ ] Daten werden in DB gespeichert

**Priority:** 🔴 KRITISCH - Vor Production Launch

---

### Task 6.2: Subscription Lifecycle testen
**Tests:**
- [ ] Premium-Upgrade durchführen
- [ ] 7-Tage-Trial läuft
- [ ] Nach Trial: Erste Zahlung
- [ ] Zahlung fehlschlagen lassen
- [ ] Retry-Versuche beobachten
- [ ] Mahnungen werden erstellt
- [ ] Abo pausieren
- [ ] Abo reaktivieren
- [ ] Abo kündigen

**Priority:** 🟡 WICHTIG - System-Validierung

---

### Task 6.3: Admin-Dashboard testen
**Tests:**
- [ ] Offene Mahnfälle anzeigen
- [ ] Collection Cases erstellen
- [ ] Export-Funktion (manuell)
- [ ] Status-Updates
- [ ] Aktenzeichen eintragen

**Priority:** 🟢 OPTIONAL - Admin-Features

---

## 📊 PHASE 7: MONITORING & MAINTENANCE (OPTIONAL)

### Task 7.1: Cron Jobs einrichten
**Supabase pg_cron:**
```sql
-- Täglich: Dunning-Checks
SELECT cron.schedule('process-dunning', '0 10 * * *', $$
  -- Auto-versende fällige Mahnungen
  -- Update Zinsen
$$);

-- Täglich: Cleanup
SELECT cron.schedule('cleanup-logs', '0 2 * * *', $$
  DELETE FROM subscription_audit_log
  WHERE created_at < now() - interval '2 years';
$$);
```

**Priority:** 🟢 OPTIONAL - Für Production

---

### Task 7.2: Error Tracking (Sentry)
**Setup:**
1. Sentry Account erstellen
2. Project für JETZZ erstellen
3. SDK installieren: `npm install @sentry/react-native`
4. Konfigurieren in app.config.js

**Priority:** 🟢 OPTIONAL - Für Production

---

## 📝 ZUSAMMENFASSUNG NÄCHSTE SCHRITTE

### HEUTE (2-3 Stunden):
1. ✅ Stripe Keys in .env eintragen
2. ✅ Stripe Produkte erstellen (Monthly/Yearly)
3. ✅ Stripe Webhook konfigurieren
4. ✅ create-premium-checkout Edge Function erstellen
5. ✅ stripe-webhook Edge Function erweitern

### MORGEN (3-4 Stunden):
6. ✅ PremiumUpgradeModal erstellen
7. ✅ PaymentRequiredPage erstellen
8. ✅ Event-Creation Blockade implementieren
9. ✅ CompleteProfileModal integrieren
10. ✅ Testing im Test Mode

### SPÄTER (Optional):
11. ⭕ pause/resume-subscription Functions
12. ⭕ E-Mail Templates
13. ⭕ PDF-Generierung für Mahnungen
14. ⭕ Collection Export (ZIP)
15. ⭕ Monitoring & Alerts

---

## 🎯 ERFOLGS-KRITERIEN

### Minimum Viable Product (MVP):
- [x] Datenbank-Schema komplett
- [ ] User kann Premium-Abo abschließen (mit Trial)
- [ ] Zahlung wird von Stripe verarbeitet
- [ ] Webhooks synchronisieren Daten
- [ ] Bei Zahlungsausfall: Retry-System läuft
- [ ] Nach 4 Failures: Mahnfall wird erstellt
- [ ] Admin kann Mahnfälle sehen
- [ ] Event-Erstellung wird bei past_due blockiert

### Production Ready:
- [ ] Alle kritischen Edge Functions deployed
- [ ] E-Mail-Benachrichtigungen aktiv
- [ ] Testing abgeschlossen
- [ ] Monitoring eingerichtet
- [ ] Dokumentation für Admins

---

## 🔑 WICHTIGE NOTIZEN

**Stripe Test vs. Production:**
- Aktuell: Test Mode (`sk_test_...`, `pk_test_...`)
- Für Production: Neue Keys aus Live Mode
- Webhook URLs müssen auch für Live Mode konfiguriert werden

**Datenbank:**
- Alle Migrationen bereits angewendet ✅
- Keine weiteren DB-Änderungen nötig

**Security:**
- Stripe Keys NUR in Backend (Edge Functions)
- Publishable Key kann im Frontend verwendet werden
- NIEMALS Secret Key im Frontend!

**Preise:**
- Monthly: 4,99 € (nach 7-day trial)
- Yearly: 49,99 € (16% Ersparnis, nach 7-day trial)
- Mahngebühren: 5€ + 10€ + 15€ = 30€

---

**STATUS:** Ready to implement! 🚀
**NÄCHSTER SCHRITT:** Phase 1 - Stripe Keys eintragen
