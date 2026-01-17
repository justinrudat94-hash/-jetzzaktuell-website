'use client'

import { useState, useEffect } from 'react'
import { Event, getSpotlightEvents } from '@/lib/events'
import EventSlider from './EventSlider'
import EventDetailModal from './EventDetailModal'
import { Loader, Sparkles } from 'lucide-react'

export default function SpotlightSection() {
  const [spotlightEvents, setSpotlightEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    async function fetchSpotlightEvents() {
      setLoading(true)
      try {
        const events = await getSpotlightEvents()
        setSpotlightEvents(events)
      } catch (error) {
        console.error('Error fetching spotlight events:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSpotlightEvents()
  }, [])

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setTimeout(() => setSelectedEvent(null), 300)
  }

  if (loading) {
    return null
  }

  if (spotlightEvents.length === 0) {
    return null
  }

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-100 to-pink-100 rounded-full mb-4">
            <Sparkles className="w-5 h-5 text-orange-600" />
            <span className="text-orange-800 font-semibold text-sm">Hervorgehoben</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Spotlight Events
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Diese Events solltest du auf keinen Fall verpassen
          </p>
        </div>

        <EventSlider events={spotlightEvents} onEventClick={handleEventClick} />
      </div>

      <EventDetailModal
        event={selectedEvent}
        isOpen={showModal}
        onClose={handleCloseModal}
      />
    </section>
  )
}
