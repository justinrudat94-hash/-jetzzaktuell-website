import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'AGB - Jetzz',
  description: 'Allgemeine Geschäftsbedingungen der Jetzz App',
}

export default function AGB() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Allgemeine Geschäftsbedingungen</h1>

        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Geltungsbereich</h2>
            <p className="text-gray-700 leading-relaxed">
              Diese Allgemeinen Geschäftsbedingungen regeln die Nutzung der JETZZ Mobile App und der damit verbundenen
              Dienste, die von IMMOPRO LLC, 1209 Mountain Road Pl NE Ste N, Albuquerque, NM 87110, USA bereitgestellt werden.
              Mit der Nutzung der App erklären Sie sich mit diesen Bedingungen einverstanden.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Leistungsbeschreibung</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              <strong>Kostenlose Basis-Funktionen:</strong>
            </p>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-1 mb-4">
              <li>Events in der Umgebung entdecken und durchsuchen</li>
              <li>Eigene Events erstellen und verwalten</li>
              <li>Events liken, kommentieren und teilen</li>
              <li>Anderen Nutzern folgen</li>
              <li>Kartenansicht mit Event-Markierungen</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-2">
              <strong>Kostenpflichtige Zusatzleistungen:</strong>
            </p>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-1">
              <li>Premium-Abonnement (monatlich 4,99 EUR, jährlich 39,99 EUR)</li>
              <li>Coins-Pakete (0,99 EUR bis 69,99 EUR)</li>
              <li>Event-Ticket-Verkauf (5% Platform-Fee)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Registrierung und Nutzerkonto</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              <strong>Voraussetzungen:</strong>
            </p>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-1 mb-4">
              <li>Mindestalter: 13 Jahre</li>
              <li>Personen unter 18 Jahren benötigen Zustimmung der Eltern</li>
              <li>Nur ein Account pro Person zulässig</li>
              <li>Wahrheitsgemäße und vollständige Angaben erforderlich</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              Sie sind verpflichtet, Ihre Zugangsdaten geheim zu halten und vor dem Zugriff durch Dritte zu schützen.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Verbotene Inhalte und Verhaltensweisen</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              <strong>Folgende Inhalte sind untersagt:</strong>
            </p>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-1">
              <li>Rechtswidrige, beleidigende oder diskriminierende Inhalte</li>
              <li>Hassrede, Gewaltdarstellungen oder pornografische Inhalte</li>
              <li>Urheberrechtsverletzungen oder Markenrechtsverletzungen</li>
              <li>Spam, Phishing oder betrügerische Inhalte</li>
              <li>Bilder von Personen ohne deren Einwilligung</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Bei Verstößen können Maßnahmen von Verwarnung bis permanenter Sperrung ergriffen werden.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Event-Erstellung</h2>
            <p className="text-gray-700 leading-relaxed">
              Als Veranstalter sind Sie allein verantwortlich für die Richtigkeit der Event-Informationen, die Durchführung
              des Events und die Einhaltung aller gesetzlichen Vorgaben. Der Anbieter ist lediglich Vermittler und
              übernimmt keine Haftung für die Durchführung oder Absage von Events.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Zahlungsbedingungen</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              Alle Zahlungen erfolgen über unseren Payment-Provider Stripe Inc. Unterstützte Zahlungsmethoden sind
              Kreditkarte und Debitkarte. Alle Preise sind Endpreise inkl. MwSt.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              <strong>Widerrufsrecht:</strong> Bei digitalen Inhalten (Coins, Premium-Abo) erlischt das Widerrufsrecht
              mit sofortiger Bereitstellung nach Ihrer Zustimmung. Event-Tickets sind vom Widerrufsrecht ausgeschlossen.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Haftung</h2>
            <p className="text-gray-700 leading-relaxed">
              Der Anbieter haftet unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit
              sowie bei Vorsatz und grober Fahrlässigkeit. Bei leichter Fahrlässigkeit haftet der Anbieter nur bei
              Verletzung wesentlicher Vertragspflichten, beschränkt auf den vorhersehbaren Schaden. Für Inhalte Dritter
              (Nutzer-Events) haftet der Anbieter nicht.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Datenschutz</h2>
            <p className="text-gray-700 leading-relaxed">
              Die Verarbeitung personenbezogener Daten erfolgt gemäß unserer Datenschutzerklärung und den Vorgaben der DSGVO.
              Sie haben jederzeit das Recht auf Auskunft, Berichtigung, Löschung und Datenübertragbarkeit.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Kündigung</h2>
            <p className="text-gray-700 leading-relaxed">
              Sie können Ihr Nutzerkonto jederzeit in den Einstellungen löschen. Premium-Abonnements können jederzeit
              gekündigt werden, wirksam zum Ende der laufenden Abo-Periode. Das Recht zur außerordentlichen Kündigung
              aus wichtigem Grund bleibt unberührt.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Änderungen der AGB</h2>
            <p className="text-gray-700 leading-relaxed">
              Der Anbieter behält sich das Recht vor, diese AGB jederzeit zu ändern. Registrierte Nutzer werden mindestens
              14 Tage vor Inkrafttreten per E-Mail informiert. Widersprechen Sie nicht innerhalb von 14 Tagen, gelten die
              geänderten AGB als angenommen.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Anwendbares Recht</h2>
            <p className="text-gray-700 leading-relaxed">
              Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Bei Verbrauchern
              bleiben zwingende gesetzliche Bestimmungen des Wohnsitzlandes anwendbar.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Kontakt</h2>
            <p className="text-gray-700 leading-relaxed">
              IMMOPRO LLC<br />
              1209 MOUNTAIN ROAD PL NE STE N<br />
              Albuquerque, NM 87110, USA<br />
              E-Mail: <a href="mailto:support@jetzz.app" className="text-primary-600 hover:underline">support@jetzz.app</a>
            </p>
          </section>

          <p className="text-sm text-gray-500 mt-8">
            Stand: Dezember 2024 | Version 1.0
          </p>
        </div>
      </div>
      <Footer />
    </main>
  )
}
