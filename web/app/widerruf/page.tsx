import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Widerrufsbelehrung - Jetzz',
  description: 'Widerrufsbelehrung der Jetzz App',
}

export default function Widerruf() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Widerrufsbelehrung</h1>

        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Widerrufsrecht</h2>
            <p className="text-gray-700 leading-relaxed">
              Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Um Ihr Widerrufsrecht auszuüben, müssen Sie uns
            </p>
            <p className="text-gray-700 leading-relaxed font-semibold mt-2">
              IMMOPRO LLC<br />
              1209 MOUNTAIN ROAD PL NE STE N<br />
              Albuquerque, NM 87110<br />
              United States of America<br />
              E-Mail: support@jetzz.app
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) über Ihren
              Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte
              Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts
              vor Ablauf der Widerrufsfrist absenden.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Folgen des Widerrufs</h2>
            <p className="text-gray-700 leading-relaxed">
              Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben,
              einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie
              eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben),
              unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über
              Ihren Widerruf dieses Vertrags bei uns eingegangen ist.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion
              eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden
              Ihnen wegen dieser Rückzahlung Entgelte berechnet.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Besondere Hinweise</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">Vorzeitiges Erlöschen des Widerrufsrechts bei digitalen Inhalten</h3>
            <p className="text-gray-700 leading-relaxed">
              Das Widerrufsrecht erlischt vorzeitig bei Verträgen über die Lieferung von nicht auf einem körperlichen
              Datenträger befindlichen digitalen Inhalten, wenn wir mit der Ausführung des Vertrags begonnen haben, nachdem Sie
            </p>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-1 mt-2">
              <li>ausdrücklich zugestimmt haben, dass wir mit der Ausführung des Vertrags vor Ablauf der Widerrufsfrist beginnen, und</li>
              <li>Ihre Kenntnis davon bestätigt haben, dass Sie durch Ihre Zustimmung mit Beginn der Ausführung des Vertrags Ihr Widerrufsrecht verlieren.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              <strong>Dies betrifft:</strong>
            </p>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-1">
              <li><strong>Coin-Käufe:</strong> Coins werden sofort nach Zahlung gutgeschrieben</li>
              <li><strong>Premium-Abonnements:</strong> Premium-Features werden sofort nach Zahlungseingang freigeschaltet</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-6">Ausschluss des Widerrufsrechts bei Event-Tickets</h3>
            <p className="text-gray-700 leading-relaxed">
              Das Widerrufsrecht besteht nicht bei Verträgen zur Erbringung von Dienstleistungen in den Bereichen
              Beherbergung zu anderen Zwecken als zu Wohnzwecken, Beförderung von Waren, Kraftfahrzeugvermietung,
              Lieferung von Speisen und Getränken sowie zur Erbringung weiterer Dienstleistungen im Zusammenhang mit
              Freizeitbetätigungen, wenn der Vertrag für die Erbringung einen spezifischen Termin oder Zeitraum vorsieht.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              <strong>Dies betrifft:</strong>
            </p>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-1">
              <li><strong>Event-Tickets:</strong> Kein Widerrufsrecht (§ 312g Abs. 2 Nr. 9 BGB)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Muster-Widerrufsformular</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              (Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)
            </p>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <p className="text-gray-700 leading-relaxed font-mono text-sm">
                An<br />
                IMMOPRO LLC<br />
                1209 MOUNTAIN ROAD PL NE STE N<br />
                Albuquerque, NM 87110<br />
                United States of America<br />
                E-Mail: support@jetzz.app
              </p>
              <p className="text-gray-700 leading-relaxed font-mono text-sm mt-4">
                Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden
                Waren (*)/die Erbringung der folgenden Dienstleistung (*)
              </p>
              <p className="text-gray-700 leading-relaxed font-mono text-sm mt-4">
                _________________________________________________________________
              </p>
              <p className="text-gray-700 leading-relaxed font-mono text-sm mt-4">
                Bestellt am (*)/erhalten am (*)
              </p>
              <p className="text-gray-700 leading-relaxed font-mono text-sm mt-4">
                _________________________________________________________________
              </p>
              <p className="text-gray-700 leading-relaxed font-mono text-sm mt-4">
                Name des/der Verbraucher(s)
              </p>
              <p className="text-gray-700 leading-relaxed font-mono text-sm mt-4">
                _________________________________________________________________
              </p>
              <p className="text-gray-700 leading-relaxed font-mono text-sm mt-4">
                Anschrift des/der Verbraucher(s)
              </p>
              <p className="text-gray-700 leading-relaxed font-mono text-sm mt-4">
                _________________________________________________________________
              </p>
              <p className="text-gray-700 leading-relaxed font-mono text-sm mt-4">
                Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)
              </p>
              <p className="text-gray-700 leading-relaxed font-mono text-sm mt-4">
                _________________________________________________________________
              </p>
              <p className="text-gray-700 leading-relaxed font-mono text-sm mt-4">
                Datum
              </p>
              <p className="text-gray-700 leading-relaxed font-mono text-sm mt-4">
                _________________________________________________________________
              </p>
              <p className="text-gray-700 leading-relaxed font-mono text-sm italic mt-4">
                (*) Unzutreffendes streichen.
              </p>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  )
}
