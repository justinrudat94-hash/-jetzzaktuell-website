'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  MapPin,
  Calendar,
  Clock,
  Users,
  Share2,
  Ticket,
  Navigation,
  Phone,
  Mail,
  Globe,
  Music,
} from 'lucide-react'
import { Event, formatEventDate, formatEventTime, getEventImage, formatEventPrice } from '@/lib/events'
import Image from 'next/image'

interface EventDetailModalProps {
  event: Event | null
  isOpen: boolean
  onClose: () => void
}

export default function EventDetailModal({ event, isOpen, onClose }: EventDetailModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!event) return null

  const eventImage = getEventImage(event)

  const getLocationText = (event: Event) => {
    const parts = []
    if (event.street) parts.push(event.street)
    if (event.postcode && event.city) {
      parts.push(`${event.postcode} ${event.city}`)
    } else if (event.city) {
      parts.push(event.city)
    } else if (event.postcode) {
      parts.push(event.postcode)
    }
    if (parts.length > 0) return parts.join(', ')
    if (event.location) return event.location
    return 'Ort wird nachgetragen'
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.description || '',
          url: window.location.href,
        })
      } catch (err) {
        console.error('Error sharing:', err)
      }
    }
  }

  const openTicketLink = () => {
    const url = event.ticket_link
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const openNavigation = () => {
    if (event.latitude && event.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <div
              className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-80">
                <Image
                  src={eventImage}
                  alt={event.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 896px) 100vw, 896px"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-10 h-10 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full flex items-center justify-center transition-colors duration-200 shadow-lg"
                  aria-label="Schließen"
                >
                  <X className="w-5 h-5 text-gray-800" />
                </button>

                {event.category && (
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded-full shadow-lg">
                      {event.category}
                    </span>
                  </div>
                )}

                <div className="absolute bottom-6 left-6 right-6">
                  <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                    {event.title}
                  </h2>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[calc(90vh-20rem)] p-6">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-gray-900">Datum</p>
                        <p className="text-gray-600">{formatEventDate(event.start_date)}</p>
                      </div>
                    </div>

                    {event.start_time && (
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                        <div>
                          <p className="font-semibold text-gray-900">Uhrzeit</p>
                          <p className="text-gray-600">
                            {formatEventTime(event.start_time)} Uhr
                            {event.end_time && ` - ${formatEventTime(event.end_time)} Uhr`}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-gray-900">Ort</p>
                        <p className="text-gray-600">{getLocationText(event)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Ticket className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-gray-900">Preis</p>
                        <p className="text-gray-600">{formatEventPrice(event)}</p>
                      </div>
                    </div>

                    {event.max_participants > 0 && (
                      <div className="flex items-start gap-3">
                        <Users className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
                        <div>
                          <p className="font-semibold text-gray-900">Teilnehmer</p>
                          <p className="text-gray-600">
                            {event.current_participants} / {event.max_participants} Personen
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {event.description && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Beschreibung</h3>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                      {event.description}
                    </p>
                  </div>
                )}

                {event.lineup && Array.isArray(event.lineup) && event.lineup.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Music className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Line-up</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {event.lineup.map((artist: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                        >
                          {artist}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(event.contact_email || event.contact_phone || event.contact_website) && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Kontakt</h3>
                    <div className="space-y-2">
                      {event.contact_email && (
                        <a
                          href={`mailto:${event.contact_email}`}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                          {event.contact_email}
                        </a>
                      )}
                      {event.contact_phone && (
                        <a
                          href={`tel:${event.contact_phone}`}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                          {event.contact_phone}
                        </a>
                      )}
                      {event.contact_website && (
                        <a
                          href={event.contact_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <Globe className="w-4 h-4" />
                          Webseite besuchen
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-4 border-t">
                  {event.ticket_link && (
                    <button
                      onClick={openTicketLink}
                      className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
                    >
                      <Ticket className="w-5 h-5" />
                      Tickets kaufen
                    </button>
                  )}

                  {event.latitude && event.longitude && (
                    <button
                      onClick={openNavigation}
                      className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200"
                    >
                      <Navigation className="w-5 h-5" />
                      Navigation starten
                    </button>
                  )}

                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors duration-200"
                  >
                    <Share2 className="w-5 h-5" />
                    Teilen
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
