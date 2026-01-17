'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import { Event } from '@/lib/events'
import EventSliderCard from './EventSliderCard'

interface CircularEventSliderProps {
  events: Event[]
  onEventClick: (event: Event) => void
}

export default function CircularEventSlider({ events, onEventClick }: CircularEventSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [visibleCards, setVisibleCards] = useState(7)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setVisibleCards(3)
      } else if (window.innerWidth < 1024) {
        setVisibleCards(5)
      } else {
        setVisibleCards(7)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!isPaused && events.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % events.length)
      }, 4000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPaused, events.length])

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + events.length) % events.length)
  }, [events.length])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % events.length)
  }, [events.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrevious, handleNext])

  const getCardStyle = (offset: number): React.CSSProperties => {
    const totalCards = visibleCards
    const middleIndex = Math.floor(totalCards / 2)
    const normalizedOffset = offset - middleIndex

    const angle = (normalizedOffset * 360) / totalCards
    const radius = visibleCards === 3 ? 180 : visibleCards === 5 ? 280 : 350
    const translateZ = Math.cos((normalizedOffset * Math.PI) / (totalCards / 2)) * radius
    const scale = 1 - Math.abs(normalizedOffset) * 0.15
    const opacity = 1 - Math.abs(normalizedOffset) * 0.15

    return {
      transform: `
        rotateY(${angle}deg)
        translateZ(${translateZ}px)
        scale(${Math.max(scale, 0.6)})
      `,
      opacity: Math.max(opacity, 0.3),
      zIndex: Math.round((1 - Math.abs(normalizedOffset) / totalCards) * 100),
    }
  }

  const getVisibleEvents = () => {
    const visible = []
    const halfVisible = Math.floor(visibleCards / 2)

    for (let i = -halfVisible; i <= halfVisible; i++) {
      const index = (currentIndex + i + events.length) % events.length
      visible.push({
        event: events[index],
        offset: i + halfVisible,
        key: `${events[index].id}-${index}`
      })
    }

    return visible
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-gray-100 rounded-2xl">
        <p className="text-gray-500 text-lg">Keine Events verfügbar</p>
      </div>
    )
  }

  const visibleEvents = getVisibleEvents()
  const centerEvent = events[currentIndex]
  const isBoosted = centerEvent?.boost_type === 'spotlight' &&
                    centerEvent?.boost_expires_at &&
                    new Date(centerEvent.boost_expires_at) > new Date()

  return (
    <div
      className="relative py-12"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="relative mx-auto"
        style={{
          height: visibleCards === 3 ? '450px' : visibleCards === 5 ? '550px' : '600px',
          perspective: '2000px',
          perspectiveOrigin: 'center center'
        }}
      >
        <div
          className="relative w-full h-full"
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {visibleEvents.map(({ event, offset, key }) => (
            <motion.div
              key={key}
              className="absolute left-1/2 top-1/2"
              style={{
                ...getCardStyle(offset),
                width: visibleCards === 3 ? '280px' : visibleCards === 5 ? '320px' : '360px',
                marginLeft: visibleCards === 3 ? '-140px' : visibleCards === 5 ? '-160px' : '-180px',
                marginTop: '-200px',
                transformStyle: 'preserve-3d',
              }}
              initial={false}
              animate={{
                transition: {
                  duration: 0.6,
                  ease: [0.25, 0.1, 0.25, 1],
                }
              }}
            >
              <div className="relative">
                {event.boost_type === 'spotlight' &&
                 event.boost_expires_at &&
                 new Date(event.boost_expires_at) > new Date() && (
                  <div className="absolute -top-3 -right-3 z-50">
                    <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white p-2 rounded-full shadow-lg animate-pulse">
                      <Zap className="w-5 h-5" fill="currentColor" />
                    </div>
                  </div>
                )}
                <EventSliderCard
                  event={event}
                  onClick={() => onEventClick(event)}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {isBoosted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
              <Zap className="w-4 h-4" fill="currentColor" />
              <span className="text-sm font-bold">Premium Event</span>
            </div>
          </motion.div>
        )}
      </div>

      {events.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 w-14 h-14 bg-white/95 hover:bg-white backdrop-blur-sm rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Vorheriges Event"
          >
            <ChevronLeft className="w-7 h-7 text-gray-800" />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-14 h-14 bg-white/95 hover:bg-white backdrop-blur-sm rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Nächstes Event"
          >
            <ChevronRight className="w-7 h-7 text-gray-800" />
          </button>
        </>
      )}

      <div className="flex justify-center gap-2 mt-8">
        {events.slice(0, Math.min(events.length, 16)).map((event, idx) => (
          <button
            key={event.id}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === currentIndex
                ? 'w-10 bg-gradient-to-r from-blue-500 to-blue-600'
                : 'w-2 bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Gehe zu Event ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
