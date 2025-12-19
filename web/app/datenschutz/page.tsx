import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Datenschutzerklärung - Jetzz',
  description: 'Datenschutzerklärung der Jetzz App',
}

export default function Datenschutz() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Datenschutzerklärung</h1>

        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Verantwortlicher</h2>
            <p className="text-gray-700 leading-relaxed">
              IMMOPRO LLC<br />
              1209 MOUNTAIN ROAD PL NE STE N<br />
              Albuquerque, NM 87110<br />
              United States of America<br />
              E-Mail: privacy@jetzz.app
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Welche Daten werden erhoben?</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">Bei Registrierung</h3>
            <p className="text-gray-700 leading-relaxed">
              Vorname, Nachname, E-Mail-Adresse, Benutzername, Geburtsdatum, Postleitzahl, Stadt, Passwort (verschlüsselt)
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">Bei Nutzung der App</h3>
            <p className="text-gray-700 leading-relaxed">
              Events, Kommentare, Likes, Follows, Profilbilder, Event-Bilder, Nutzungsstatistiken, IP-Adresse,
              Standortdaten (mit Ihrer Zustimmung)
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">Bei Zahlungen</h3>
            <p className="text-gray-700 leading-relaxed">
              Zahlungsdaten (verarbeitet durch Stripe), Transaktionshistorie, Rechnungsdaten
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">Bei KYC-Verifizierung</h3>
            <p className="text-gray-700 leading-relaxed">
              Ausweisdokumente (verarbeitet durch Stripe Identity), verifizierte Identitätsdaten
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Rechtsgrundlagen (DSGVO)</h2>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2">
              <li><strong>Art. 6 Abs. 1 lit. b:</strong> Vertragserfüllung (Bereitstellung der App-Funktionen)</li>
              <li><strong>Art. 6 Abs. 1 lit. a:</strong> Einwilligung (Marketing, Standort, optionale Features)</li>
              <li><strong>Art. 6 Abs. 1 lit. f:</strong> Berechtigtes Interesse (Sicherheit, Betrugsbekämpfung)</li>
              <li><strong>Art. 6 Abs. 1 lit. c:</strong> Rechtliche Verpflichtung (Aufbewahrungspflichten, KYC)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Weitergabe an Dritte</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              <strong>Datenempfänger:</strong>
            </p>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-1">
              <li>Supabase (Hosting, Datenbank)</li>
              <li>Stripe (Zahlungsabwicklung, KYC-Verifizierung)</li>
              <li>Cloud-Provider (Server-Infrastruktur)</li>
              <li>Behörden (bei rechtlicher Verpflichtung)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              <strong>Keine Weitergabe an:</strong> Werbepartner (ohne Ihre Einwilligung), Datenbroker, soziale Netzwerke (ohne Ihre Einwilligung)
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Speicherdauer</h2>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-1">
              <li>Account-Daten: Solange Ihr Account aktiv ist</li>
              <li>Inhalte: Bis zur Löschung durch Sie</li>
              <li>Transaktionsdaten: 10 Jahre (gesetzliche Aufbewahrungspflicht)</li>
              <li>KYC-Daten: 5 Jahre nach letzter Transaktion</li>
              <li>Logs: 30 Tage</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Ihre Rechte</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              Nach der DSGVO haben Sie das Recht auf:
            </p>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-1">
              <li><strong>Auskunft</strong> (Art. 15 DSGVO): Welche Daten gespeichert sind</li>
              <li><strong>Berichtigung</strong> (Art. 16 DSGVO): Korrektur falscher Daten</li>
              <li><strong>Löschung</strong> (Art. 17 DSGVO): "Recht auf Vergessenwerden"</li>
              <li><strong>Einschränkung</strong> (Art. 18 DSGVO): Einschränkung der Verarbeitung</li>
              <li><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO): Datenexport</li>
              <li><strong>Widerspruch</strong> (Art. 21 DSGVO): Widerspruch gegen Verarbeitung</li>
              <li><strong>Beschwerde</strong> bei der Datenschutzbehörde</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Kontakt: <a href="mailto:privacy@jetzz.app" className="text-primary-600 hover:underline">privacy@jetzz.app</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cookies und Tracking</h2>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-1">
              <li>Technisch notwendige Cookies: Session, Login</li>
              <li>Analyse-Cookies: Nur mit Ihrer Einwilligung</li>
              <li>Marketing-Cookies: Nur mit Ihrer Einwilligung</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Sicherheit</h2>
            <p className="text-gray-700 leading-relaxed">
              Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um Ihre Daten zu schützen:
              Verschlüsselte Übertragung (HTTPS/TLS), verschlüsselte Speicherung sensibler Daten, Zugriffskontrolle,
              regelmäßige Backups und Security-Audits.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Kontakt</h2>
            <p className="text-gray-700 leading-relaxed">
              Bei Fragen zum Datenschutz kontaktieren Sie uns unter:<br />
              E-Mail: <a href="mailto:privacy@jetzz.app" className="text-primary-600 hover:underline">privacy@jetzz.app</a>
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  )
}
