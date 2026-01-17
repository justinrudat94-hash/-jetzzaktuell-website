'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-md' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="text-2xl font-bold text-primary-600">Jetzz</div>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="#features"
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              Features
            </Link>
            <Link
              href="#download"
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              Download
            </Link>
            <Link
              href="/impressum"
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              Impressum
            </Link>
            <Link
              href="#download"
              className="bg-primary-600 text-white px-6 py-2 rounded-full hover:bg-primary-700 transition-colors"
            >
              App laden
            </Link>
          </div>

          <button
            className="md:hidden text-gray-700"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-4 py-4 space-y-3">
            <Link
              href="#features"
              className="block text-gray-700 hover:text-primary-600 py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#download"
              className="block text-gray-700 hover:text-primary-600 py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Download
            </Link>
            <Link
              href="/impressum"
              className="block text-gray-700 hover:text-primary-600 py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Impressum
            </Link>
            <Link
              href="#download"
              className="block bg-primary-600 text-white px-6 py-2 rounded-full text-center hover:bg-primary-700 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              App laden
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
