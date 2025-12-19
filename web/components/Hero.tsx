'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Event, getMixedHeroEvents } from '@/lib/events'
import EventSlider from './EventSlider'
import EventDetailModal from './EventDetailModal'

export default function Hero() {
  const [heroEvents, setHeroEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    async function fetchHeroEvents() {
      setLoading(true)
      try {
        const events = await getMixedHeroEvents()
        setHeroEvents(events)
      } catch (error) {
        console.error('Error fetching hero events:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHeroEvents()
  }, [])

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setTimeout(() => setSelectedEvent(null), 300)
  }

  return (
    <section className="relative py-20 bg-gradient-to-br from-primary-50 via-white to-blue-50">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center space-x-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles size={16} />
            <span>Die Event-App für Deutschland</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
            Entdecke Events
            <br />
            <span className="text-primary-600">in deiner Nähe</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Finde Konzerte, Festivals, Partys und mehr. Erstelle eigene Events, vernetze dich mit anderen und verpasse nie wieder dein Lieblingsevent.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Link
              href="#download"
              className="group bg-primary-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-primary-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <span>Jetzt kostenlos laden</span>
              <ArrowRight
                size={20}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
            <Link
              href="#features"
              className="text-gray-700 px-8 py-4 rounded-full text-lg font-semibold border-2 border-gray-300 hover:border-primary-600 hover:text-primary-600 transition-all duration-300"
            >
              Mehr erfahren
            </Link>
          </div>

          <div className="pt-8 flex items-center justify-center space-x-8 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Über 10.000+ Events</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>100% kostenlos</span>
            </div>
          </div>
        </motion.div>

        {!loading && heroEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16"
          >
            <EventSlider events={heroEvents} onEventClick={handleEventClick} />
          </motion.div>
        )}
      </div>

      <EventDetailModal
        event={selectedEvent}
        isOpen={showModal}
        onClose={handleCloseModal}
      />
    </section>
  )
}
