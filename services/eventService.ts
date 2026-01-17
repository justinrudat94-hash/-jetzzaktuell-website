import { supabase } from '../lib/supabase';
import { getUserId } from '../utils/userStorage';
import { geocodeAddress } from '../utils/geocoding';
import { awardEventCreationCoins } from './rewardService';
import { moderateEvent, createModerationQueue } from './moderationService';

export const mapEventImages = (event: any) => {
  if (!event) return event;

  return {
    ...event,
    image: event.preview_image_url || event.image_url || event.image || 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg',
  };
};

export interface CreateEventData {
  title: string;
  description: string;
  category: string;
  season_special?: string;
  postcode: string;
  city: string;
  street?: string;
  durationType: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  previewImageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  ageRating: string;
  isFree: boolean;
  price?: string;
  ticketsRequired: boolean;
  ticketLink?: string;
  idRequired: boolean;
  vouchersAvailable: boolean;
  sponsors?: string;
  lineup?: Array<{name: string; startTime: string; endTime: string; description: string}>;
  additionalInfo?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWebsite?: string;
}

export const createEvent = async (eventData: CreateEventData) => {
  const userId = await getUserId();

  console.log('Creating event with user ID:', userId);

  let moderationResult = {
    allowed: true,
    flagged: false,
    riskLevel: 'safe' as const,
    flaggedCategories: []
  };

  try {
    moderationResult = await moderateEvent(
      eventData.title,
      eventData.description,
      'temp-event-id'
    );

    if (!moderationResult.allowed) {
      throw new Error(
        moderationResult.reason ||
        'Event-Inhalt verstößt gegen Community-Richtlinien und wurde blockiert.'
      );
    }
  } catch (error) {
    console.warn('Moderation failed, allowing event creation:', error);
  }

  const coordinates = await geocodeAddress(
    eventData.street,
    eventData.city,
    eventData.postcode
  );

  console.log('Geocoded coordinates:', coordinates);

  const { data, error } = await supabase
    .from('events')
    .insert({
      user_id: userId,
      title: eventData.title,
      description: eventData.description,
      category: eventData.category,
      season_special: eventData.season_special || null,
      postcode: eventData.postcode,
      city: eventData.city,
      street: eventData.street || null,
      latitude: coordinates?.latitude || null,
      longitude: coordinates?.longitude || null,
      duration_type: eventData.durationType,
      start_date: eventData.startDate,
      start_time: eventData.startTime,
      end_date: eventData.endDate,
      end_time: eventData.endTime,
      preview_image_url: eventData.previewImageUrl || null,
      image_urls: eventData.imageUrls || [],
      video_url: eventData.videoUrl || null,
      age_rating: eventData.ageRating,
      is_free: eventData.isFree,
      price: eventData.price ? parseFloat(eventData.price) : null,
      tickets_required: eventData.ticketsRequired,
      ticket_link: eventData.ticketLink || null,
      id_required: eventData.idRequired,
      vouchers_available: eventData.vouchersAvailable,
      sponsors: eventData.sponsors || null,
      lineup: eventData.lineup || null,
      additional_info: eventData.additionalInfo || null,
      contact_email: eventData.contactEmail || null,
      contact_phone: eventData.contactPhone || null,
      contact_website: eventData.contactWebsite || null,
      is_published: true,
      attendees: 0,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error creating event:', error);
    throw error;
  }

  console.log('Event created successfully:', data);

  if (data?.id) {
    if (moderationResult.flagged && moderationResult.riskLevel !== 'safe') {
      await createModerationQueue({
        contentType: 'event',
        contentId: data.id,
        userId: userId!,
        riskLevel: moderationResult.riskLevel,
        flaggedCategories: moderationResult.flaggedCategories,
        originalContent: `${eventData.title}\n${eventData.description}`,
      });
      console.log('⚠️ Event flagged for review:', moderationResult.riskLevel);
    }

    await awardEventCreationCoins(data.id);
    console.log('✨ Event creation coins awarded!');
  }

  return data;
};

export const getUserEvents = async (userId: string) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data?.map(mapEventImages) || [];
};

export const getPublishedEvents = async () => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_published', true)
    .gte('start_date', today)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const now = new Date();
  const filteredData = (data || []).filter(event => {
    const eventDateTime = new Date(`${event.start_date}T${event.start_time || '00:00'}`);
    return eventDateTime > now;
  });

  return filteredData.map(mapEventImages);
};

export const getAllEvents = async (limit?: number) => {
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('events')
    .select('*')
    .eq('is_published', true)
    .gte('start_date', today)
    .order('start_date', { ascending: true });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }

  const now = new Date();
  const filteredData = (data || []).filter(event => {
    const eventDateTime = new Date(`${event.start_date}T${event.start_time || '00:00'}`);
    return eventDateTime > now;
  });

  return filteredData.map(mapEventImages);
};

export const getCurrentUserEvents = async () => {
  const userId = await getUserId();

  console.log('Fetching events for user ID:', userId);

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user events:', error);
    return [];
  }

  console.log('Found user events:', data?.length || 0);
  return data?.map(mapEventImages) || [];
};

export const getEventById = async (eventId: string) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching event:', error);
    return null;
  }

  return data ? mapEventImages(data) : null;
};

export const deleteEvent = async (eventId: string) => {
  const userId = await getUserId();

  if (!userId) {
    throw new Error('User not authenticated');
  }

  const event = await getEventById(eventId);

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.user_id !== userId) {
    throw new Error('Unauthorized: You can only delete your own events');
  }

  console.log('Deleting event:', eventId, 'for user:', userId);

  const { data, error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('user_id', userId)
    .select();

  if (error) {
    console.error('Error deleting event:', error);
    throw error;
  }

  console.log('Delete result:', data);
  return true;
};

export const updateEvent = async (eventId: string, eventData: Partial<CreateEventData>) => {
  const userId = await getUserId();

  console.log('Updating event:', eventId, 'for user:', userId);
  console.log('Update data:', eventData);

  const updateData: any = {};

  if (eventData.title !== undefined) updateData.title = eventData.title;
  if (eventData.description !== undefined) updateData.description = eventData.description;
  if (eventData.category !== undefined) updateData.category = eventData.category;
  if (eventData.season_special !== undefined) updateData.season_special = eventData.season_special || null;
  if (eventData.postcode !== undefined) updateData.postcode = eventData.postcode;
  if (eventData.city !== undefined) updateData.city = eventData.city;
  if (eventData.street !== undefined) updateData.street = eventData.street || null;

  const addressChanged =
    eventData.street !== undefined ||
    eventData.city !== undefined ||
    eventData.postcode !== undefined;

  if (addressChanged) {
    const event = await getEventById(eventId);
    if (event) {
      const coordinates = await geocodeAddress(
        eventData.street !== undefined ? eventData.street : event.street,
        eventData.city !== undefined ? eventData.city : event.city,
        eventData.postcode !== undefined ? eventData.postcode : event.postcode
      );

      if (coordinates) {
        updateData.latitude = coordinates.latitude;
        updateData.longitude = coordinates.longitude;
        console.log('Updated coordinates:', coordinates);
      }
    }
  }

  if (eventData.durationType !== undefined) updateData.duration_type = eventData.durationType;
  if (eventData.startDate !== undefined) updateData.start_date = eventData.startDate || null;
  if (eventData.startTime !== undefined) updateData.start_time = eventData.startTime || null;
  if (eventData.endDate !== undefined) updateData.end_date = eventData.endDate || null;
  if (eventData.endTime !== undefined) updateData.end_time = eventData.endTime || null;
  if (eventData.previewImageUrl !== undefined) updateData.preview_image_url = eventData.previewImageUrl || null;
  if (eventData.imageUrls !== undefined) updateData.image_urls = eventData.imageUrls || [];
  if (eventData.videoUrl !== undefined) updateData.video_url = eventData.videoUrl || null;
  if (eventData.ageRating !== undefined) updateData.age_rating = eventData.ageRating;
  if (eventData.isFree !== undefined) updateData.is_free = eventData.isFree;
  if (eventData.price !== undefined) updateData.price = eventData.price ? parseFloat(eventData.price) : null;
  if (eventData.ticketsRequired !== undefined) updateData.tickets_required = eventData.ticketsRequired;
  if (eventData.ticketLink !== undefined) updateData.ticket_link = eventData.ticketLink || null;
  if (eventData.idRequired !== undefined) updateData.id_required = eventData.idRequired;
  if (eventData.vouchersAvailable !== undefined) updateData.vouchers_available = eventData.vouchersAvailable;
  if (eventData.sponsors !== undefined) updateData.sponsors = eventData.sponsors || null;
  if (eventData.lineup !== undefined) updateData.lineup = eventData.lineup || null;
  if (eventData.additionalInfo !== undefined) updateData.additional_info = eventData.additionalInfo || null;
  if (eventData.contactEmail !== undefined) updateData.contact_email = eventData.contactEmail || null;
  if (eventData.contactPhone !== undefined) updateData.contact_phone = eventData.contactPhone || null;
  if (eventData.contactWebsite !== undefined) updateData.contact_website = eventData.contactWebsite || null;

  console.log('Prepared update data:', updateData);

  const { data, error } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', eventId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error updating event:', error);
    throw error;
  }

  if (!data) {
    console.error('No data returned after update. Event not found or user is not owner.');
    throw new Error('Event konnte nicht aktualisiert werden. Bist du der Besitzer?');
  }

  console.log('Event updated successfully:', data);
  return data;
};

export const getHighlightEvents = async () => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_published', true)
    .eq('is_boosted', true)
    .eq('boost_type', 'spotlight')
    .gt('boost_expires_at', new Date().toISOString())
    .gte('start_date', today)
    .order('boost_priority', { ascending: false })
    .order('boosted_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching highlight events:', error);
    return [];
  }

  const now = new Date();
  const filteredData = (data || []).filter(event => {
    const eventDateTime = new Date(`${event.start_date}T${event.start_time || '00:00'}`);
    return eventDateTime > now;
  });

  return filteredData.map(mapEventImages);
};

export const getNearbyEvents = async (userLat?: number, userLon?: number, radiusKm: number = 50) => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_published', true)
    .gte('start_date', today)
    .order('boost_priority', { ascending: false })
    .order('start_date', { ascending: true })
    .limit(50);

  if (error) {
    console.error('Error fetching nearby events:', error);
    return [];
  }

  const now = new Date();
  let filteredData = (data || []).filter(event => {
    const eventDateTime = new Date(`${event.start_date}T${event.start_time || '00:00'}`);
    return eventDateTime > now;
  });

  if (userLat && userLon) {
    filteredData = filteredData.map(event => {
      if (event.latitude && event.longitude) {
        const distance = calculateDistance(
          userLat,
          userLon,
          event.latitude,
          event.longitude
        );
        return { ...event, distance };
      }
      return { ...event, distance: null };
    });

    filteredData = filteredData.filter(event =>
      event.distance === null || event.distance <= radiusKm
    );

    filteredData.sort((a, b) => {
      if (a.boost_priority !== b.boost_priority) {
        return (b.boost_priority || 0) - (a.boost_priority || 0);
      }

      if (a.is_boosted && b.is_boosted) {
        const aInRadius = a.boost_radius_km && a.distance && a.distance <= a.boost_radius_km;
        const bInRadius = b.boost_radius_km && b.distance && b.distance <= b.boost_radius_km;

        if (aInRadius && !bInRadius) return -1;
        if (!aInRadius && bInRadius) return 1;
      }

      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }

      return 0;
    });
  }

  return filteredData.map(mapEventImages);
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
