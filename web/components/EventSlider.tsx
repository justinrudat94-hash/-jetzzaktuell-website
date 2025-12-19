'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Event } from '@/lib/events'
import EventSliderCard from './EventSliderCard'

interface EventSliderProps {
  events: Event[]
  onEventClick: (event: Event) => void
}

export default function EventSlider({ events, onEventClick }: EventSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [visibleCards, setVisibleCards] = useState(3)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setVisibleCards(1)
      } else if (window.innerWidth < 1200) {
        setVisibleCards(2)
      } else {
        setVisibleCards(3)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!isPaused && events.length > visibleCards) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % events.length)
      }, 5500)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPaused, events.length, visibleCards])

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + events.length) % events.length)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % events.length)
  }

  const getVisibleEvents = () => {
    const visible = []
    for (let i = 0; i < visibleCards; i++) {
      const index = (currentIndex + i) % events.length
      visible.push(events[index])
    }
    return visible
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-gray-100 rounded-2xl">
        <p className="text-gray-500 text-lg">Keine Events gefunden</p>
      </div>
    )
  }

  const visibleEvents = getVisibleEvents()

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="overflow-hidden">
        <div className="flex gap-6 px-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {visibleEvents.map((event, idx) => (
              <motion.div
                key={`${event.id}-${currentIndex}-${idx}`}
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -300 }}
                transition={{
                  duration: 1.5,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                className="flex-1 min-w-0"
                style={{
                  flexBasis: visibleCards === 1 ? '100%' : visibleCards === 2 ? 'calc(50% - 12px)' : 'calc(33.333% - 16px)'
                }}
              >
                <EventSliderCard
                  event={event}
                  onClick={() => onEventClick(event)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {events.length > visibleCards && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-12 h-12 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
            aria-label="Vorheriges Event"
          >
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-12 h-12 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
            aria-label="Nächstes Event"
          >
            <ChevronRight className="w-6 h-6 text-gray-800" />
          </button>
        </>
      )}

      <div className="flex justify-center gap-2 mt-6">
        {events.slice(0, Math.min(events.length, 12)).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === currentIndex
                ? 'w-8 bg-blue-600'
                : 'w-2 bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Gehe zu Event ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
