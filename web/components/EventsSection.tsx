'use client'

import { useState, useEffect, useCallback } from 'react'
import { Event, EventFilters as EventFiltersType, getEvents, getCircularSliderEvents } from '@/lib/events'
import EventSlider from './EventSlider'
import CircularEventSlider from './CircularEventSlider'
import EventFilters from './EventFilters'
import EventDetailModal from './EventDetailModal'
import { Loader } from 'lucide-react'

export default function EventsSection() {
  const [events, setEvents] = useState<Event[]>([])
  const [circularEvents, setCircularEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [circularLoading, setCircularLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [filters, setFilters] = useState<EventFiltersType>({
    category: 'Alle',
    dateFilter: 'Alle',
    priceMin: 0,
    priceMax: Infinity,
  })

  const fetchCircularEvents = useCallback(async () => {
    setCircularLoading(true)
    try {
      const fetchedCircularEvents = await getCircularSliderEvents()
      setCircularEvents(fetchedCircularEvents)
    } catch (error) {
      console.error('Error fetching circular events:', error)
    } finally {
      setCircularLoading(false)
    }
  }, [])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const fetchedEvents = await getEvents(filters)
      setEvents(fetchedEvents)
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchCircularEvents()
  }, [fetchCircularEvents])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setTimeout(() => setSelectedEvent(null), 300)
  }

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Event Highlights
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Entdecke die besten Events und Premium-Highlights
          </p>
        </div>

        {circularLoading ? (
          <div className="flex flex-col items-center justify-center h-[500px]">
            <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600">Highlights werden geladen...</p>
          </div>
        ) : circularEvents.length > 0 ? (
          <CircularEventSlider
            events={circularEvents}
            onEventClick={handleEventClick}
          />
        ) : null}

        <div className="text-center mt-16 mb-12">
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Alle Events durchsuchen
          </h3>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Finde die besten Veranstaltungen in deiner Nähe und sichere dir jetzt deine Tickets
          </p>
        </div>

        <EventFilters
          filters={filters}
          onFiltersChange={setFilters}
          eventCount={events.length}
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[400px]">
            <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600">Events werden geladen...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] bg-gray-100 rounded-2xl">
            <p className="text-gray-500 text-lg mb-4">Keine Events gefunden</p>
            <p className="text-gray-400 text-sm">
              Versuche andere Filter oder schaue später wieder vorbei
            </p>
          </div>
        ) : (
          <EventSlider events={events} onEventClick={handleEventClick} />
        )}

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            Noch mehr Events und Features in der App
          </p>
          <a
            href="#download"
            className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            App herunterladen
          </a>
        </div>
      </div>

      <EventDetailModal
        event={selectedEvent}
        isOpen={showModal}
        onClose={handleCloseModal}
      />
    </section>
  )
}
