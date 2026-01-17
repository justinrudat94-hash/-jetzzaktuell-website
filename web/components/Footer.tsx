import Link from 'next/link'
import { Instagram, Twitter, Facebook, Mail } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1">
            <h3 className="text-2xl font-bold text-primary-400 mb-4">Jetzz</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Die ultimative Event-App für Deutschland. Entdecke, erstelle und teile Events in
              deiner Nähe.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-white">Produkt</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#features" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#download" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Download
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Premium
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-white">Rechtliches</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/impressum" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Impressum
                </Link>
              </li>
              <li>
                <Link href="/datenschutz" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Datenschutz
                </Link>
              </li>
              <li>
                <Link href="/agb" className="text-gray-400 hover:text-primary-400 transition-colors">
                  AGB
                </Link>
              </li>
              <li>
                <Link href="/widerruf" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Widerruf
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-white">Kontakt</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="mailto:info@jetzz.app"
                  className="text-gray-400 hover:text-primary-400 transition-colors flex items-center space-x-2"
                >
                  <Mail size={16} />
                  <span>info@jetzz.app</span>
                </a>
              </li>
            </ul>
            <div className="flex space-x-4 mt-6">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary-400 transition-colors"
              >
                <Instagram size={20} />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary-400 transition-colors"
              >
                <Twitter size={20} />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary-400 transition-colors"
              >
                <Facebook size={20} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
          <p>© {currentYear} Jetzz. Alle Rechte vorbehalten.</p>
          <p className="mt-2 md:mt-0">Made with ❤️ in Germany</p>
        </div>
      </div>
    </footer>
  )
}
