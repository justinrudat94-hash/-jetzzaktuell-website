import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Impressum - Jetzz',
  description: 'Impressum und Anbieterkennung der Jetzz App',
}

export default function Impressum() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Impressum</h1>

        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Angaben gemäß § 5 TMG</h2>
            <p className="text-gray-700 leading-relaxed">
              IMMOPRO LLC<br />
              1209 MOUNTAIN ROAD PL NE STE N<br />
              Albuquerque, NM 87110<br />
              United States of America
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Kontakt</h2>
            <p className="text-gray-700 leading-relaxed">
              E-Mail: support@jetzz.app<br />
              Web: https://jetzz.app
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Vertreten durch</h2>
            <p className="text-gray-700 leading-relaxed">
              IMMOPRO LLC<br />
              (Limited Liability Company nach US-Recht)
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Registereintrag</h2>
            <p className="text-gray-700 leading-relaxed">
              Registriert in: New Mexico, USA<br />
              Register-Art: Limited Liability Company
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">EU-Streitschlichtung</h2>
            <p className="text-gray-700 leading-relaxed">
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:<br />
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                https://ec.europa.eu/consumers/odr
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Verbraucherstreitbeilegung</h2>
            <p className="text-gray-700 leading-relaxed">
              Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
            <p className="text-gray-700 leading-relaxed">
              IMMOPRO LLC<br />
              1209 MOUNTAIN ROAD PL NE STE N<br />
              Albuquerque, NM 87110<br />
              United States of America
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  )
}
