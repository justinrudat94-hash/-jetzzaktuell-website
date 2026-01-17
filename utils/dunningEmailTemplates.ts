interface DunningEmailData {
  firstName: string;
  lastName: string;
  invoiceNumber: string;
  amountDue: number;
  lateFee: number;
  totalAmount: number;
  dueDate: string;
  originalDueDate: string;
  dunningNumber: string;
  level: 1 | 2 | 3;
}

export const dunningEmailTemplates = {
  /**
   * 1. Mahnung (First Reminder)
   */
  level1: (data: DunningEmailData) => ({
    subject: `1. Zahlungserinnerung - Rechnung ${data.invoiceNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .content { padding: 20px 0; }
    .invoice-details { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .amount { font-size: 24px; font-weight: bold; color: #ffc107; }
    .button { display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    .warning { background-color: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; color: #333;">Zahlungserinnerung</h1>
      <p style="margin: 5px 0 0 0; color: #666;">Mahnnummer: ${data.dunningNumber}</p>
    </div>

    <div class="content">
      <p>Sehr geehrte/r ${data.firstName} ${data.lastName},</p>

      <p>
        wir haben festgestellt, dass die folgende Rechnung zum Fälligkeitsdatum noch nicht beglichen wurde:
      </p>

      <div class="invoice-details">
        <table style="width: 100%;">
          <tr>
            <td><strong>Rechnungsnummer:</strong></td>
            <td>${data.invoiceNumber}</td>
          </tr>
          <tr>
            <td><strong>Ursprüngliches Fälligkeitsdatum:</strong></td>
            <td>${new Date(data.originalDueDate).toLocaleDateString('de-DE')}</td>
          </tr>
          <tr>
            <td><strong>Offener Betrag:</strong></td>
            <td>${(data.amountDue / 100).toFixed(2)} €</td>
          </tr>
          <tr>
            <td><strong>Mahngebühr:</strong></td>
            <td>${(data.lateFee / 100).toFixed(2)} €</td>
          </tr>
          <tr style="border-top: 2px solid #ddd;">
            <td><strong>Gesamtbetrag:</strong></td>
            <td class="amount">${(data.totalAmount / 100).toFixed(2)} €</td>
          </tr>
        </table>
      </div>

      <p>
        <strong>Neue Zahlungsfrist: ${new Date(data.dueDate).toLocaleDateString('de-DE')}</strong>
      </p>

      <p>
        Falls Sie den Betrag bereits überwiesen haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.
        Sollte die Zahlung aus einem bestimmten Grund noch nicht erfolgt sein, bitten wir Sie, den ausstehenden
        Betrag innerhalb der nächsten 14 Tage zu begleichen.
      </p>

      <center>
        <a href="{{PAYMENT_LINK}}" class="button">Jetzt bezahlen</a>
      </center>

      <div class="warning">
        <strong>Hinweis:</strong> Bei Nichtbeachtung dieser Zahlungserinnerung sind wir gezwungen,
        weitere Mahnschritte einzuleiten, die mit zusätzlichen Kosten verbunden sein können.
      </div>

      <p>
        Bei Fragen oder Zahlungsschwierigkeiten stehen wir Ihnen gerne zur Verfügung.
        Bitte kontaktieren Sie uns unter support@jetzz-app.de.
      </p>

      <p>Mit freundlichen Grüßen<br>Ihr Jetzz-Team</p>
    </div>

    <div class="footer">
      <p>
        Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht direkt auf diese E-Mail.
        Bei Fragen wenden Sie sich bitte an support@jetzz-app.de
      </p>
    </div>
  </div>
</body>
</html>
    `,
    text: `
1. Zahlungserinnerung

Sehr geehrte/r ${data.firstName} ${data.lastName},

wir haben festgestellt, dass die folgende Rechnung zum Fälligkeitsdatum noch nicht beglichen wurde:

Rechnungsnummer: ${data.invoiceNumber}
Ursprüngliches Fälligkeitsdatum: ${new Date(data.originalDueDate).toLocaleDateString('de-DE')}
Offener Betrag: ${(data.amountDue / 100).toFixed(2)} €
Mahngebühr: ${(data.lateFee / 100).toFixed(2)} €
---
Gesamtbetrag: ${(data.totalAmount / 100).toFixed(2)} €

Neue Zahlungsfrist: ${new Date(data.dueDate).toLocaleDateString('de-DE')}

Falls Sie den Betrag bereits überwiesen haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.

Bitte begleichen Sie den ausstehenden Betrag innerhalb der nächsten 14 Tage.

Jetzt bezahlen: {{PAYMENT_LINK}}

Mit freundlichen Grüßen
Ihr Jetzz-Team
    `
  }),

  /**
   * 2. Mahnung (Second Reminder)
   */
  level2: (data: DunningEmailData) => ({
    subject: `2. Mahnung - Rechnung ${data.invoiceNumber} - Bitte umgehend begleichen`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #ff9800; padding: 20px; border-radius: 8px; margin-bottom: 30px; color: white; }
    .content { padding: 20px 0; }
    .invoice-details { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .amount { font-size: 24px; font-weight: bold; color: #ff9800; }
    .button { display: inline-block; padding: 12px 30px; background-color: #ff9800; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    .urgent { background-color: #ff9800; color: white; padding: 15px; border-radius: 5px; margin: 20px 0; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">2. Mahnung</h1>
      <p style="margin: 5px 0 0 0;">Mahnnummer: ${data.dunningNumber}</p>
    </div>

    <div class="content">
      <p>Sehr geehrte/r ${data.firstName} ${data.lastName},</p>

      <p>
        <strong>trotz unserer ersten Zahlungserinnerung ist bis heute kein Zahlungseingang erfolgt.</strong>
      </p>

      <p>
        Wir fordern Sie hiermit erneut zur Zahlung des folgenden Betrages auf:
      </p>

      <div class="invoice-details">
        <table style="width: 100%;">
          <tr>
            <td><strong>Rechnungsnummer:</strong></td>
            <td>${data.invoiceNumber}</td>
          </tr>
          <tr>
            <td><strong>Ursprünglicher Betrag:</strong></td>
            <td>${(data.amountDue / 100).toFixed(2)} €</td>
          </tr>
          <tr>
            <td><strong>Mahngebühren:</strong></td>
            <td>${(data.lateFee / 100).toFixed(2)} €</td>
          </tr>
          <tr style="border-top: 2px solid #ddd;">
            <td><strong>Gesamtforderung:</strong></td>
            <td class="amount">${(data.totalAmount / 100).toFixed(2)} €</td>
          </tr>
        </table>
      </div>

      <div class="urgent">
        ⚠️ WICHTIG: Zahlungsfrist bis ${new Date(data.dueDate).toLocaleDateString('de-DE')}
      </div>

      <p>
        Wir bitten Sie dringend, den ausstehenden Betrag <strong>innerhalb von 14 Tagen</strong> zu begleichen.
      </p>

      <center>
        <a href="{{PAYMENT_LINK}}" class="button">JETZT BEZAHLEN</a>
      </center>

      <p style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ff9800;">
        <strong>Bitte beachten Sie:</strong><br>
        Bei ausbleibender Zahlung bis zum ${new Date(data.dueDate).toLocaleDateString('de-DE')} werden wir weitere
        rechtliche Schritte einleiten. Dies kann zur Einschaltung eines Inkassobüros und zu weiteren Kosten führen.
      </p>

      <p>
        Falls Sie Zahlungsschwierigkeiten haben, kontaktieren Sie uns bitte umgehend unter support@jetzz-app.de,
        um eine Lösung zu finden.
      </p>

      <p>Mit freundlichen Grüßen<br>Ihr Jetzz-Team</p>
    </div>

    <div class="footer">
      <p>
        Diese E-Mail wurde automatisch generiert. Bei Fragen wenden Sie sich bitte an support@jetzz-app.de
      </p>
    </div>
  </div>
</body>
</html>
    `,
    text: `
2. MAHNUNG

Sehr geehrte/r ${data.firstName} ${data.lastName},

trotz unserer ersten Zahlungserinnerung ist bis heute kein Zahlungseingang erfolgt.

Wir fordern Sie hiermit erneut zur Zahlung auf:

Rechnungsnummer: ${data.invoiceNumber}
Ursprünglicher Betrag: ${(data.amountDue / 100).toFixed(2)} €
Mahngebühren: ${(data.lateFee / 100).toFixed(2)} €
---
GESAMTFORDERUNG: ${(data.totalAmount / 100).toFixed(2)} €

⚠️ ZAHLUNGSFRIST: ${new Date(data.dueDate).toLocaleDateString('de-DE')}

Bei ausbleibender Zahlung werden wir weitere rechtliche Schritte einleiten.

Jetzt bezahlen: {{PAYMENT_LINK}}

Mit freundlichen Grüßen
Ihr Jetzz-Team
    `
  }),

  /**
   * 3. Mahnung (Final Warning - Before Collection)
   */
  level3: (data: DunningEmailData) => ({
    subject: `LETZTE MAHNUNG - Rechnung ${data.invoiceNumber} - Inkasso-Androhung`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f44336; padding: 20px; border-radius: 8px; margin-bottom: 30px; color: white; }
    .content { padding: 20px 0; }
    .invoice-details { background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0; border: 2px solid #f44336; }
    .amount { font-size: 28px; font-weight: bold; color: #f44336; }
    .button { display: inline-block; padding: 15px 40px; background-color: #f44336; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-size: 18px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    .critical { background-color: #f44336; color: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">⚠️ LETZTE MAHNUNG</h1>
      <h2 style="margin: 10px 0 0 0; font-weight: normal;">Vor Inkasso-Übergabe</h2>
      <p style="margin: 5px 0 0 0;">Mahnnummer: ${data.dunningNumber}</p>
    </div>

    <div class="content">
      <p>Sehr geehrte/r ${data.firstName} ${data.lastName},</p>

      <p style="font-size: 16px;">
        <strong>
          Trotz mehrfacher Aufforderung ist die Zahlung der folgenden Rechnung ausgeblieben.
          Dies ist unsere letzte Mahnung vor Einschaltung eines Inkassobüros.
        </strong>
      </p>

      <div class="invoice-details">
        <table style="width: 100%;">
          <tr>
            <td><strong>Rechnungsnummer:</strong></td>
            <td>${data.invoiceNumber}</td>
          </tr>
          <tr>
            <td><strong>Hauptforderung:</strong></td>
            <td>${(data.amountDue / 100).toFixed(2)} €</td>
          </tr>
          <tr>
            <td><strong>Mahngebühren (kumuliert):</strong></td>
            <td>${(data.lateFee / 100).toFixed(2)} €</td>
          </tr>
          <tr>
            <td><strong>Verzugszinsen:</strong></td>
            <td>Werden täglich berechnet</td>
          </tr>
          <tr style="border-top: 3px solid #f44336;">
            <td><strong style="font-size: 18px;">GESAMTFORDERUNG:</strong></td>
            <td class="amount">${(data.totalAmount / 100).toFixed(2)} €</td>
          </tr>
        </table>
      </div>

      <div class="critical">
        <h3 style="margin-top: 0;">🚨 KRITISCHE ZAHLUNGSFRIST</h3>
        <p style="font-size: 18px; margin: 10px 0;">
          <strong>Bis spätestens: ${new Date(data.dueDate).toLocaleDateString('de-DE')}</strong>
        </p>
        <p style="margin-bottom: 0;">
          Nach Ablauf dieser Frist übergeben wir den Fall ohne weitere Ankündigung an ein Inkassobüro!
        </p>
      </div>

      <center>
        <a href="{{PAYMENT_LINK}}" class="button">SOFORT BEZAHLEN</a>
      </center>

      <div style="background-color: #fff3cd; padding: 20px; border-left: 4px solid #f44336; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #f44336;">Folgen bei Nichtbeachtung:</h4>
        <ul style="margin: 10px 0;">
          <li>Übergabe an ein Inkassobüro</li>
          <li>Zusätzliche Inkassokosten (bis zu 150 €)</li>
          <li>Negativer Eintrag bei Auskunfteien möglich</li>
          <li>Eventuelle gerichtliche Mahnverfahren</li>
          <li>Weitere Verzugszinsen</li>
        </ul>
      </div>

      <p style="font-size: 16px; border-top: 2px solid #f44336; padding-top: 20px; margin-top: 30px;">
        <strong>Letzte Möglichkeit zur außergerichtlichen Einigung:</strong><br>
        Falls Sie Zahlungsschwierigkeiten haben, kontaktieren Sie uns <strong>SOFORT</strong> unter
        support@jetzz-app.de oder telefonisch. Wir sind bereit, über Ratenzahlungen zu sprechen,
        aber nur bei sofortigem Kontakt!
      </p>

      <p style="font-weight: bold;">Mit freundlichen Grüßen<br>Ihr Jetzz-Team<br>Forderungsmanagement</p>
    </div>

    <div class="footer">
      <p style="font-weight: bold;">
        Dies ist eine formelle Mahnung gemäß §§ 286, 288 BGB. Bitte nehmen Sie diese ernst.
      </p>
    </div>
  </div>
</body>
</html>
    `,
    text: `
⚠️ LETZTE MAHNUNG VOR INKASSO-ÜBERGABE ⚠️

Sehr geehrte/r ${data.firstName} ${data.lastName},

Trotz mehrfacher Aufforderung ist die Zahlung ausgeblieben.
Dies ist unsere letzte Mahnung vor Einschaltung eines Inkassobüros.

Rechnungsnummer: ${data.invoiceNumber}
Hauptforderung: ${(data.amountDue / 100).toFixed(2)} €
Mahngebühren: ${(data.lateFee / 100).toFixed(2)} €
---
GESAMTFORDERUNG: ${(data.totalAmount / 100).toFixed(2)} €

🚨 KRITISCHE ZAHLUNGSFRIST: ${new Date(data.dueDate).toLocaleDateString('de-DE')}

Nach Ablauf dieser Frist übergeben wir den Fall ohne weitere Ankündigung an ein Inkassobüro!

SOFORT BEZAHLEN: {{PAYMENT_LINK}}

Folgen bei Nichtbeachtung:
- Übergabe an Inkassobüro
- Zusätzliche Inkassokosten (bis zu 150 €)
- Negativer Eintrag bei Auskunfteien
- Gerichtliche Mahnverfahren

Bei Zahlungsschwierigkeiten kontaktieren Sie uns SOFORT: support@jetzz-app.de

Mit freundlichen Grüßen
Ihr Jetzz-Team - Forderungsmanagement
    `
  })
};

export function getDunningEmailTemplate(level: 1 | 2 | 3, data: DunningEmailData) {
  const templates = {
    1: dunningEmailTemplates.level1,
    2: dunningEmailTemplates.level2,
    3: dunningEmailTemplates.level3,
  };

  return templates[level](data);
}
