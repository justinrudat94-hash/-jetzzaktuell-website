'use client'

import { Event, formatEventDate, formatEventTime, getEventImage, formatEventPrice } from '@/lib/events'
import { MapPin, Calendar, Users, Ticket } from 'lucide-react'
import Image from 'next/image'

interface EventSliderCardProps {
  event: Event
  onClick: () => void
}

export default function EventSliderCard({ event, onClick }: EventSliderCardProps) {
  const eventImage = getEventImage(event)

  const getLocationText = (event: Event) => {
    if (event.city) {
      return event.city
    }
    if (event.location) {
      return event.location
    }
    return 'Ort wird nachgetragen'
  }

  return (
    <div
      onClick={onClick}
      className="relative h-[400px] rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-105 hover:shadow-2xl flex-shrink-0"
    >
      <Image
        src={eventImage}
        alt={event.title}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={false}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />

      <div className="absolute inset-0 p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          {event.category && (
            <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
              {event.category}
            </span>
          )}
          <span className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full">
            {formatEventPrice(event)}
          </span>
        </div>

        <div className="space-y-3 transform group-hover:translate-y-0 transition-transform duration-300">
          <h3 className="text-2xl font-bold text-white line-clamp-2 leading-tight">
            {event.title}
          </h3>

          {event.description && (
            <p className="text-gray-200 text-sm line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {event.description}
            </p>
          )}

          <div className="space-y-2 text-white">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">
                {formatEventDate(event.start_date)}
                {event.start_time && ` • ${formatEventTime(event.start_time)} Uhr`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm line-clamp-1">{getLocationText(event)}</span>
            </div>

            <div className="flex items-center justify-between pt-2">
              {event.max_participants > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{event.current_participants} Teilnehmer</span>
                </div>
              )}

              {event.ticket_link && (
                <div className="flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Ticket className="w-4 h-4" />
                  <span className="text-xs font-semibold">Tickets</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200">
              Details anzeigen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
