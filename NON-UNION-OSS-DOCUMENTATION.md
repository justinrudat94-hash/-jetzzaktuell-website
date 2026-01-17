# Non-Union OSS (One-Stop-Shop) System - Dokumentation

## Übersicht

Dieses System ermöglicht die vollständige Erfassung und quartalsweise Meldung von Umsatzsteuerdaten gemäß dem **Non-Union OSS-Verfahren** für eine US-LLC, die digitale Dienstleistungen in der gesamten EU anbietet.

## Was ist Non-Union OSS?

Das **Non-Union OSS-Verfahren** (One-Stop-Shop) ist ein vereinfachtes Verfahren zur Abrechnung der Umsatzsteuer für nicht in der EU ansässige Unternehmen, die elektronische Dienstleistungen an Verbraucher in EU-Mitgliedstaaten erbringen.

### Wichtige Eckdaten

- **Meldezeitraum**: Quartalsweise (Q1, Q2, Q3, Q4)
- **Meldefrist**: **Letzter Tag des Folgemonats** nach Quartalsende
- **Zahlungsfrist**: Gleich wie Meldefrist
- **USt-Sätze**: **Länderspezifisch** (z.B. DE: 19%, IE: 23%, FR: 20%, etc.)
- **Registrierung**: **In EINEM EU-Land** (empfohlen: Irland für englischsprachige Unternehmen)
- **OSS-Portal**: Über das gewählte Registrierungsland (z.B. Revenue Commissioners für Irland)

### Quartale und Fristen (Korrekt)

| Quartal | Zeitraum | Frist für Meldung & Zahlung |
|---------|----------|----------------------------|
| Q1 | 01.01. - 31.03. | **30. April** |
| Q2 | 01.04. - 30.06. | **31. Juli** |
| Q3 | 01.07. - 30.09. | **31. Oktober** |
| Q4 | 01.10. - 31.12. | **31. Januar (Folgejahr)** |

**Wichtig:** Die Frist ist immer der **letzte Tag des Monats**, der auf das Quartalsende folgt!

## Systemarchitektur

### 1. Datenbank-Schema

#### Tabelle: `ust_transactions`

Speichert alle USt-pflichtigen Transaktionen mit vollständigen Details:

```sql
CREATE TABLE ust_transactions (
  id uuid PRIMARY KEY,
  transaction_date timestamptz NOT NULL,
  transaction_type text NOT NULL, -- coin_purchase, premium_subscription, ticket_purchase, boost_purchase
  user_id uuid REFERENCES auth.users(id),
  stripe_payment_intent_id text,
  related_entity_id uuid,
  country_code text NOT NULL DEFAULT 'DE',
  gross_amount numeric(10,2) NOT NULL,
  net_amount numeric(10,2) NOT NULL,
  vat_rate numeric(5,2) NOT NULL,
  vat_amount numeric(10,2) NOT NULL,
  service_description text,
  invoice_number text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```

#### Tabelle: `ust_quarterly_reports`

Speichert generierte Quartalsberichte:

```sql
CREATE TABLE ust_quarterly_reports (
  id uuid PRIMARY KEY,
  year integer NOT NULL,
  quarter integer NOT NULL,
  country_code text NOT NULL DEFAULT 'DE',
  total_transactions integer NOT NULL DEFAULT 0,
  total_net_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_vat_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_gross_amount numeric(12,2) NOT NULL DEFAULT 0,
  report_data jsonb,
  status text NOT NULL DEFAULT 'draft', -- draft, submitted, paid
  generated_at timestamptz,
  generated_by uuid,
  submission_date timestamptz,
  payment_date timestamptz,
  payment_reference text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
);
```

### 2. Automatisches Tracking

Das System tracked automatisch alle USt-pflichtigen Transaktionen über die Stripe-Webhook-Integration:

#### Getrackte Transaktionstypen

1. **Coin-Käufe** (`coin_purchase`)
   - Event: `checkout.session.completed`
   - Bruttobetrag wird aus Stripe-Session extrahiert
   - Netto und USt werden automatisch berechnet

2. **Premium-Abonnements** (`premium_subscription`)
   - Event: `invoice.payment_succeeded`
   - Wiederkehrende Zahlungen werden bei jeder Abrechnung erfasst
   - Trial-Phasen werden NICHT erfasst (keine Zahlung)

3. **Ticket-Käufe** (`ticket_purchase`)
   - Event: `payment_intent.succeeded`
   - Jeder Ticket-Kauf wird einzeln erfasst

4. **Boost-Käufe** (`boost_purchase`)
   - Vorbereitet für zukünftige Implementierung

#### Automatische Berechnung

Für jede Transaktion werden automatisch berechnet:

```typescript
// Beispiel für 19% USt (Deutschland)
Brutto: 4,99 EUR
Netto:  4,19 EUR (Brutto / 1,19)
USt:    0,80 EUR (Brutto - Netto)

// Beispiel für 23% USt (Irland)
Brutto: 4,99 EUR
Netto:  4,06 EUR (Brutto / 1,23)
USt:    0,93 EUR (Brutto - Netto)
```

Die Berechnung erfolgt in der Funktion `trackUstTransaction` in der Stripe-Webhook Edge Function.

**Der USt-Satz wird dynamisch aus der Datenbank geladen** basierend auf dem Land des Kunden!

### 3. Service-Layer

Der Service-Layer (`services/ustTrackingService.ts`) bietet folgende Funktionen:

#### Hauptfunktionen

- `trackUstTransaction(data)` - Erfasst eine neue USt-Transaktion
- `getTransactionsByQuarter(year, quarter)` - Ruft alle Transaktionen eines Quartals ab
- `generateQuarterlyReport(year, quarter)` - Generiert einen Quartalsbericht
- `getQuarterlyReport(year, quarter)` - Ruft einen existierenden Bericht ab
- `updateReportStatus(reportId, status)` - Aktualisiert den Status eines Berichts
- `getQuartersOverview()` - Übersicht aller Quartale mit Daten
- `getCurrentQuarter()` - Ermittelt das aktuelle Quartal

#### Hilfsfunktionen

- `formatQuarterString(year, quarter)` - Formatiert Quartal als String (z.B. "Q1 2025")
- `formatEurAmount(amount)` - Formatiert Betrag als EUR (z.B. "4,99 €")
- `getOssDeadline(year, quarter)` - Berechnet die OSS-Meldefrist
- `isOssOverdue(year, quarter)` - Prüft, ob Meldung überfällig ist

### 4. Admin-Interface

Die Admin-Oberfläche (`app/admin/oss-tax-reports.tsx`) bietet:

#### Features

1. **Quartalsübersicht**
   - Zeigt alle Quartale mit Transaktionen
   - Statistiken: Anzahl Transaktionen, Netto-, USt-, und Bruttobeträge
   - Status-Anzeige (Entwurf, Gemeldet, Bezahlt)
   - Überfälligkeits-Warnung

2. **Berichtsgenerierung**
   - Button zum Generieren eines Quartalsberichts
   - Automatische Aggregation aller Transaktionen des Quartals
   - Aufschlüsselung nach Transaktionstyp

3. **Berichtsdetails**
   - Vollständige Übersicht eines generierten Berichts
   - Zusammenfassung der Beträge
   - Detaillierte Aufschlüsselung nach Transaktionstyp
   - Zeitraum und Fristen

4. **Status-Management**
   - "Als Gemeldet markieren" - Setzt Status auf `submitted` und trägt Meldedatum ein
   - "Als Bezahlt markieren" - Setzt Status auf `paid` und trägt Zahlungsdatum ein

## Workflow

### 1. Automatische Erfassung (Laufend)

```
Stripe-Zahlung erfolgt
    ↓
Webhook empfängt Event
    ↓
trackUstTransaction() wird aufgerufen
    ↓
Transaktion wird in ust_transactions gespeichert
```

### 2. Quartalsabschluss (Ende jedes Quartals)

1. **Admin öffnet OSS-Übersicht**
   - Navigiert zu `/admin/oss-tax-reports`
   - Sieht alle Quartale mit Daten

2. **Bericht generieren**
   - Klickt auf "Bericht generieren" für abgelaufenes Quartal
   - System aggregiert alle Transaktionen
   - Bericht wird mit Status `draft` erstellt

3. **Bericht prüfen**
   - Klickt auf "Bericht ansehen"
   - Prüft alle Beträge und Details
   - Notiert sich die Summen für OSS-Portal

4. **OSS-Meldung durchführen**
   - Loggt sich im OSS-Portal des Registrierungslandes ein (z.B. Revenue Commissioners für Irland)
   - Gibt die Summen aus dem Bericht ein - **PRO LAND EINZELN**:
     - Land: Deutschland (DE), USt-Satz: 19%, Netto: XXX €, USt: XXX €
     - Land: Österreich (AT), USt-Satz: 20%, Netto: XXX €, USt: XXX €
     - Land: Frankreich (FR), USt-Satz: 20%, Netto: XXX €, USt: XXX €
     - ... (alle Länder mit Umsatz)
   - Sendet Meldung ab
   - **Wichtig:** Ihr meldet von EINEM Land aus (z.B. Irland), aber für ALLE EU-Länder in denen ihr Umsatz hattet

5. **Status aktualisieren**
   - Markiert Bericht als "Gemeldet"
   - System trägt Meldedatum ein

6. **Zahlung durchführen**
   - Überweist USt-Betrag an BZSt
   - Verwendet Zahlungsreferenz aus OSS-Portal

7. **Status finalisieren**
   - Markiert Bericht als "Bezahlt"
   - System trägt Zahlungsdatum ein
   - Optional: Zahlungsreferenz eintragen

## Datensicherheit & Compliance

### Row Level Security (RLS)

- Nur Admins können USt-Transaktionen und -Berichte einsehen
- Normale User haben KEINEN Zugriff auf ihre eigenen USt-Daten (Datenschutz)
- System-Accounts können Transaktionen erstellen (Webhook)

### Datenintegrität

- Alle Beträge werden auf 2 Dezimalstellen gerundet
- Constraint: `gross_amount = net_amount + vat_amount`
- Transaktionen sind unveränderlich (nur INSERT, kein UPDATE/DELETE)

### Audit-Trail

- Jeder Bericht speichert:
  - Wer den Bericht generiert hat (`generated_by`)
  - Wann der Bericht generiert wurde (`generated_at`)
  - Wann die Meldung erfolgte (`submission_date`)
  - Wann die Zahlung erfolgte (`payment_date`)

## Erweiterungsmöglichkeiten

### Mehrere Länder

Aktuell ist nur Deutschland (DE) mit 19% USt konfiguriert. Für weitere Länder:

1. **USt-Satz hinzufügen**:
   ```typescript
   const VAT_RATES: Record<string, number> = {
     DE: 19.00,
     AT: 20.00, // Österreich
     FR: 20.00, // Frankreich
     // ...
   };
   ```

2. **Country-Code bei Transaktion erfassen**:
   - Idealerweise aus Stripe-Kundendaten
   - Oder über IP-Geolocation
   - Standard bleibt `DE`

3. **Quartalsberichte pro Land generieren**:
   - Parameter `countryCode` wird bereits unterstützt
   - Separate Berichte für jedes Land

### Export-Funktionalität

Für einfacheren Import in Buchhaltungssoftware:

```typescript
// CSV-Export eines Quartalsberichts
async function exportReportToCsv(year: number, quarter: number) {
  const result = await getTransactionsByQuarter(year, quarter);

  if (result.success && result.transactions) {
    const csv = convertToCSV(result.transactions);
    downloadFile(csv, `oss-report-${year}-Q${quarter}.csv`);
  }
}
```

### Automatische E-Mail-Benachrichtigungen

Erinnerung vor Ablauf der Meldefrist:

```typescript
// Cron-Job: Läuft wöchentlich
async function checkUpcomingDeadlines() {
  const quarters = await getQuartersOverview();

  for (const quarter of quarters) {
    if (!quarter.has_report || quarter.report_status !== 'paid') {
      const deadline = getOssDeadline(quarter.year, quarter.quarter);
      const daysUntilDeadline = Math.ceil(
        (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDeadline <= 7 && daysUntilDeadline > 0) {
        sendReminderEmail(quarter, daysUntilDeadline);
      }
    }
  }
}
```

## OSS-Registrierung in Irland (Empfohlen)

### Warum Irland?

- Englischsprachiges Portal
- Einfache Online-Registrierung
- Guter Support für Non-EU Unternehmen
- Stabile Prozesse

### Registrierungsprozess

1. **Revenue Online Service (ROS) Account erstellen**
   - Website: https://www.ros.ie
   - Benötigt: Firmendetails, Bankverbindung, Geschäftsführer-ID

2. **OSS-Registrierung beantragen**
   - Im ROS-Portal: "Register for VAT OSS"
   - Angabe des Geschäftsbeginns
   - Erwarteter Umsatz pro Quartal

3. **OSS-USt-ID erhalten**
   - Format: EU372XXXXXXXXX (für Non-Union OSS)
   - Diese ID in `ust_quarterly_reports.oss_vat_number` eintragen

4. **Erstes Quartal melden**
   - Deadline: Letzter Tag des Folgemonats
   - Zahlung via SEPA-Überweisung an Irish Revenue

### Unterstützte EU-Länder (aktuelle USt-Sätze im System)

Das System kennt automatisch die USt-Sätze aller 27 EU-Länder:

| Land | Code | USt-Satz | Land | Code | USt-Satz |
|------|------|----------|------|------|----------|
| Deutschland | DE | 19% | Österreich | AT | 20% |
| Belgien | BE | 21% | Bulgarien | BG | 20% |
| Kroatien | HR | 25% | Zypern | CY | 19% |
| Tschechien | CZ | 21% | Dänemark | DK | 25% |
| Estland | EE | 22% | Spanien | ES | 21% |
| Finnland | FI | 25.5% | Frankreich | FR | 20% |
| Griechenland | GR | 24% | Ungarn | HU | 27% |
| Irland | IE | 23% | Italien | IT | 22% |
| Litauen | LT | 21% | Luxemburg | LU | 17% |
| Lettland | LV | 21% | Malta | MT | 18% |
| Niederlande | NL | 21% | Polen | PL | 23% |
| Portugal | PT | 23% | Rumänien | RO | 19% |
| Schweden | SE | 25% | Slowenien | SI | 22% |
| Slowakei | SK | 20% | | | |

## Wichtige Links

- **Irland OSS-Portal (ROS)**: https://www.ros.ie
- **Revenue Commissioners OSS Guide**: https://www.revenue.ie/en/vat/vat-on-e-services/one-stop-shop/index.aspx
- **EU OSS Information**: https://ec.europa.eu/taxation_customs/business/vat/oss_en
- **Stripe Dashboard**: https://dashboard.stripe.com

## Support & Wartung

### Häufige Probleme

1. **Transaktionen werden nicht erfasst**
   - Webhook-Logs in Supabase prüfen
   - Stripe-Events in Dashboard prüfen
   - Webhook-Secret validieren

2. **Beträge stimmen nicht**
   - Prüfen, ob Rechnungsstellung korrekt ist
   - USt-Satz für Deutschland ist 19%
   - Rounding-Fehler durch 2 Dezimalstellen sind normal

3. **Bericht kann nicht generiert werden**
   - Admin-Berechtigung prüfen
   - Datenbankverbindung testen
   - Error-Logs in Supabase Functions prüfen

### Logging

Das System loggt alle wichtigen Events:

- `[UST]` - Prefix für alle USt-Tracking-Logs
- Erfolgreiche Transaktionen werden mit Beträgen geloggt
- Fehler werden mit Details geloggt

Logs können in Supabase unter "Edge Functions" → "stripe-webhook" eingesehen werden.

## Rechtlicher Hinweis

Diese Dokumentation dient nur zu Informationszwecken. Für verbindliche steuerrechtliche Beratung konsultieren Sie bitte einen Steuerberater oder die zuständigen Finanzbehörden.

Die Implementierung erfolgt nach bestem Wissen und Gewissen, jedoch übernehmen wir keine Haftung für die Richtigkeit oder Vollständigkeit der steuerlichen Berechnungen.

## Changelog

### Version 1.0 (Dezember 2024)

- Initiale Implementierung des Non-Union OSS-Systems
- Automatisches Tracking von Coin-Käufen, Premium-Abonnements und Ticket-Käufen
- Quartalsbericht-Generierung
- Admin-Interface für OSS-Meldungen
- Unterstützung für Deutschland (DE) mit 19% USt
