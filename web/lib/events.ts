import { supabase } from './supabase'

export interface Event {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
  location: string | null
  city: string | null
  street: string | null
  postcode: string | null
  latitude: number | null
  longitude: number | null
  image_url: string | null
  preview_image_url: string | null
  category: string | null
  price: number | null
  is_free: boolean
  ticket_link: string | null
  lineup: any | null
  contact_email: string | null
  contact_phone: string | null
  contact_website: string | null
  season_special: string | null
  current_participants: number
  max_participants: number
  boost_type?: string | null
  boost_priority?: number | null
  boost_expires_at?: string | null
  boosted_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface EventFilters {
  category?: string
  dateFilter?: 'Heute' | 'Morgen' | 'Diese Woche' | 'Alle'
  priceMin?: number
  priceMax?: number
  city?: string
  radius?: number | null
  userLocation?: { latitude: number; longitude: number }
  seasonSpecial?: string
}

function getDateRange(dateFilter: string): { start: string; end: string } | null {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (dateFilter) {
    case 'Heute': {
      const end = new Date(today)
      end.setDate(end.getDate() + 1)
      return {
        start: today.toISOString(),
        end: end.toISOString()
      }
    }
    case 'Morgen': {
      const start = new Date(today)
      start.setDate(start.getDate() + 1)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      return {
        start: start.toISOString(),
        end: end.toISOString()
      }
    }
    case 'Diese Woche': {
      const end = new Date(today)
      end.setDate(end.getDate() + 7)
      return {
        start: today.toISOString(),
        end: end.toISOString()
      }
    }
    case 'Alle':
    default:
      return null
  }
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function getEvents(filters: EventFilters = {}): Promise<Event[]> {
  try {
    let query = supabase
      .from('events')
      .select('*')
      .eq('is_published', true)
      .gte('start_date', new Date().toISOString().split('T')[0])
      .limit(100)

    if (filters.category && filters.category !== 'Alle') {
      query = query.eq('category', filters.category)
    }

    if (filters.dateFilter && filters.dateFilter !== 'Alle') {
      const dateRange = getDateRange(filters.dateFilter)
      if (dateRange) {
        query = query.gte('start_date', dateRange.start.split('T')[0])
        query = query.lte('start_date', dateRange.end.split('T')[0])
      }
    }

    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      if (filters.priceMin === 0 && filters.priceMax === 0) {
        query = query.eq('is_free', true)
      } else {
        if (filters.priceMin !== undefined && filters.priceMin > 0) {
          query = query.gte('price', filters.priceMin)
        }
        if (filters.priceMax !== undefined && filters.priceMax < Infinity) {
          query = query.lte('price', filters.priceMax)
        }
      }
    }

    if (filters.city) {
      query = query.ilike('city', `%${filters.city}%`)
    }

    if (filters.seasonSpecial) {
      query = query.eq('season_special', filters.seasonSpecial)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching events:', error)
      return []
    }

    let events = data || []

    if (filters.radius && filters.userLocation && filters.userLocation.latitude && filters.userLocation.longitude) {
      events = events.filter((event) => {
        if (!event.latitude || !event.longitude) return false
        const distance = calculateDistance(
          filters.userLocation!.latitude,
          filters.userLocation!.longitude,
          event.latitude,
          event.longitude
        )
        return distance <= filters.radius!
      })
    }

    events.sort((a, b) => {
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    })

    return events.slice(0, 12)
  } catch (error) {
    console.error('Error in getEvents:', error)
    return []
  }
}

export async function getEventById(id: string): Promise<Event | null> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching event:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getEventById:', error)
    return null
  }
}

export function formatEventDate(date: string): string {
  const d = new Date(date)
  return d.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function formatEventTime(time: string | null): string {
  if (!time) return ''
  return time.substring(0, 5)
}

export function getEventImage(event: Event): string {
  return event.preview_image_url || event.image_url || 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg'
}

export function formatEventPrice(event: Event): string {
  if (event.is_free) return 'Kostenlos'
  if (event.price) return `${event.price.toFixed(2)} €`
  return 'Preis auf Anfrage'
}

export async function getSpotlightEvents(): Promise<Event[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_published', true)
      .gte('start_date', new Date().toISOString().split('T')[0])
      .order('start_date', { ascending: true })
      .limit(6)

    if (error) {
      console.error('Error fetching spotlight events:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getSpotlightEvents:', error)
    return []
  }
}

export async function getMixedHeroEvents(): Promise<Event[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_published', true)
      .gte('start_date', new Date().toISOString().split('T')[0])
      .order('start_date', { ascending: true })
      .limit(12)

    if (error) {
      console.error('Error fetching mixed hero events:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getMixedHeroEvents:', error)
    return []
  }
}

export async function getCircularSliderEvents(): Promise<Event[]> {
  try {
    const today = new Date().toISOString().split('T')[0]

    const { data: boostedEvents, error: boostedError } = await supabase
      .from('events')
      .select('*')
      .eq('is_published', true)
      .eq('boost_type', 'spotlight')
      .gte('start_date', today)
      .gt('boost_expires_at', new Date().toISOString())
      .order('boost_priority', { ascending: false })
      .order('boosted_at', { ascending: false })
      .limit(16)

    if (boostedError) {
      console.error('Error fetching boosted events:', boostedError)
    }

    let events = boostedEvents || []

    if (events.length < 8) {
      const { data: regularEvents, error: regularError } = await supabase
        .from('events')
        .select('*')
        .eq('is_published', true)
        .gte('start_date', today)
        .or('boost_type.is.null,boost_expires_at.lt.' + new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(16 - events.length)

      if (regularError) {
        console.error('Error fetching regular events:', regularError)
      } else {
        events = [...events, ...(regularEvents || [])]
      }
    }

    return events.slice(0, 16)
  } catch (error) {
    console.error('Error in getCircularSliderEvents:', error)
    return []
  }
}
