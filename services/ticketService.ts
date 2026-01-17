import { supabase } from '@/lib/supabase';

export interface EventTicket {
  id: string;
  event_id: string;
  ticket_type: string;
  description: string | null;
  price: number;
  quantity_total: number;
  quantity_sold: number;
  sale_start: string;
  sale_end: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketPurchase {
  id: string;
  ticket_id: string;
  buyer_id: string;
  event_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  payment_method: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_intent_id: string | null;
  qr_code_data: string | null;
  used: boolean;
  used_at: string | null;
  purchased_at: string;
  event?: any;
  ticket?: EventTicket;
}

export const getEventTickets = async (eventId: string): Promise<EventTicket[]> => {
  try {
    const { data, error } = await supabase
      .from('event_tickets')
      .select('*')
      .eq('event_id', eventId)
      .eq('active', true)
      .order('price', { ascending: true });

    if (error) {
      console.error('Error fetching event tickets:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching event tickets:', error);
    return [];
  }
};

export const getTicketAvailability = (ticket: EventTicket): {
  available: number;
  soldOut: boolean;
  almostSoldOut: boolean;
} => {
  const available = ticket.quantity_total - ticket.quantity_sold;
  const soldOut = available === 0;
  const almostSoldOut = available <= ticket.quantity_total * 0.1 && available > 0;

  return { available, soldOut, almostSoldOut };
};

export const createTicketPurchase = async (
  ticketId: string,
  eventId: string,
  quantity: number = 1
): Promise<{ purchase: TicketPurchase | null; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { purchase: null, error: { message: 'Not authenticated' } };
    }

    const { data: ticket } = await supabase
      .from('event_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (!ticket) {
      return { purchase: null, error: { message: 'Ticket not found' } };
    }

    const availability = getTicketAvailability(ticket);
    if (availability.available < quantity) {
      return { purchase: null, error: { message: 'Not enough tickets available' } };
    }

    const unitPrice = parseFloat(ticket.price.toString());
    const totalPrice = unitPrice * quantity;

    const { data, error } = await supabase
      .from('ticket_purchases')
      .insert({
        ticket_id: ticketId,
        buyer_id: user.id,
        event_id: eventId,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        payment_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ticket purchase:', error);
      return { purchase: null, error };
    }

    return { purchase: data, error: null };
  } catch (error) {
    console.error('Error creating ticket purchase:', error);
    return { purchase: null, error };
  }
};

export const completeTicketPurchase = async (
  purchaseId: string,
  paymentIntentId: string
): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('ticket_purchases')
      .update({
        payment_status: 'completed',
        payment_intent_id: paymentIntentId,
      })
      .eq('id', purchaseId);

    return { error };
  } catch (error) {
    console.error('Error completing ticket purchase:', error);
    return { error };
  }
};

export const getUserTickets = async (): Promise<TicketPurchase[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('ticket_purchases')
      .select(`
        *,
        event:events (
          id,
          title,
          start_date,
          start_time,
          image,
          street,
          city,
          zip_code
        ),
        ticket:event_tickets (
          ticket_type,
          description
        )
      `)
      .eq('buyer_id', user.id)
      .eq('payment_status', 'completed')
      .order('purchased_at', { ascending: false });

    if (error) {
      console.error('Error fetching user tickets:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    return [];
  }
};

export const getUpcomingTickets = async (): Promise<TicketPurchase[]> => {
  try {
    const tickets = await getUserTickets();
    const now = new Date();

    return tickets.filter(ticket => {
      if (!ticket.event) return false;
      const eventDate = new Date(ticket.event.start_date);
      return eventDate >= now && !ticket.used;
    });
  } catch (error) {
    console.error('Error fetching upcoming tickets:', error);
    return [];
  }
};

export const getPastTickets = async (): Promise<TicketPurchase[]> => {
  try {
    const tickets = await getUserTickets();
    const now = new Date();

    return tickets.filter(ticket => {
      if (!ticket.event) return false;
      const eventDate = new Date(ticket.event.start_date);
      return eventDate < now || ticket.used;
    });
  } catch (error) {
    console.error('Error fetching past tickets:', error);
    return [];
  }
};

export const markTicketAsUsed = async (purchaseId: string): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('ticket_purchases')
      .update({
        used: true,
        used_at: new Date().toISOString(),
      })
      .eq('id', purchaseId);

    return { error };
  } catch (error) {
    console.error('Error marking ticket as used:', error);
    return { error };
  }
};

export const createEventTickets = async (
  eventId: string,
  tickets: Array<{
    ticket_type: string;
    description?: string;
    price: number;
    quantity_total: number;
    sale_start?: string;
    sale_end?: string;
  }>
): Promise<{ error: any }> => {
  try {
    const ticketsToInsert = tickets.map(ticket => ({
      event_id: eventId,
      ...ticket,
    }));

    const { error } = await supabase
      .from('event_tickets')
      .insert(ticketsToInsert);

    return { error };
  } catch (error) {
    console.error('Error creating event tickets:', error);
    return { error };
  }
};

export const updateEventTicket = async (
  ticketId: string,
  updates: Partial<EventTicket>
): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('event_tickets')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    return { error };
  } catch (error) {
    console.error('Error updating event ticket:', error);
    return { error };
  }
};

export const deleteEventTicket = async (ticketId: string): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('event_tickets')
      .update({ active: false })
      .eq('id', ticketId);

    return { error };
  } catch (error) {
    console.error('Error deleting event ticket:', error);
    return { error };
  }
};

export const formatPrice = (price: number): string => {
  if (price === 0) return 'Kostenlos';
  return `${price.toFixed(2)}€`;
};

export const getTicketStatusBadge = (ticket: TicketPurchase): {
  text: string;
  color: string;
} => {
  if (ticket.used) {
    return { text: 'Verwendet', color: '#94A3B8' };
  }

  if (!ticket.event) {
    return { text: 'Event gelöscht', color: '#EF4444' };
  }

  const eventDate = new Date(ticket.event.start_date);
  const now = new Date();

  if (eventDate < now) {
    return { text: 'Abgelaufen', color: '#94A3B8' };
  }

  const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil <= 1) {
    return { text: 'Heute', color: '#EF4444' };
  } else if (daysUntil <= 7) {
    return { text: 'Bald', color: '#F59E0B' };
  } else {
    return { text: 'Gültig', color: '#10B981' };
  }
};

export interface UserTicketStats {
  totalEvents: number;
  eventsThisYear: number;
  eventsThisMonth: number;
  favoriteCity: string | null;
  favoriteCategory: string | null;
  totalSpent: number;
  averagePrice: number;
  nextEvent: any | null;
}

export const getUserTicketStats = async (): Promise<UserTicketStats> => {
  try {
    const tickets = await getUserTickets();

    if (tickets.length === 0) {
      return {
        totalEvents: 0,
        eventsThisYear: 0,
        eventsThisMonth: 0,
        favoriteCity: null,
        favoriteCategory: null,
        totalSpent: 0,
        averagePrice: 0,
        nextEvent: null,
      };
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const eventsThisYear = tickets.filter(ticket => {
      if (!ticket.event) return false;
      const eventDate = new Date(ticket.event.start_date);
      return eventDate.getFullYear() === currentYear;
    }).length;

    const eventsThisMonth = tickets.filter(ticket => {
      if (!ticket.event) return false;
      const eventDate = new Date(ticket.event.start_date);
      return eventDate.getFullYear() === currentYear && eventDate.getMonth() === currentMonth;
    }).length;

    const cityCount: Record<string, number> = {};
    const categoryCount: Record<string, number> = {};

    tickets.forEach(ticket => {
      if (ticket.event?.city) {
        cityCount[ticket.event.city] = (cityCount[ticket.event.city] || 0) + 1;
      }
      if (ticket.event?.category) {
        categoryCount[ticket.event.category] = (categoryCount[ticket.event.category] || 0) + 1;
      }
    });

    const favoriteCity = Object.keys(cityCount).length > 0
      ? Object.entries(cityCount).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    const favoriteCategory = Object.keys(categoryCount).length > 0
      ? Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    const totalSpent = tickets.reduce((sum, ticket) => sum + ticket.total_price, 0);
    const averagePrice = totalSpent / tickets.length;

    const upcomingTickets = await getUpcomingTickets();
    const nextEvent = upcomingTickets.length > 0 ? upcomingTickets[0].event : null;

    return {
      totalEvents: tickets.length,
      eventsThisYear,
      eventsThisMonth,
      favoriteCity,
      favoriteCategory,
      totalSpent,
      averagePrice,
      nextEvent,
    };
  } catch (error) {
    console.error('Error getting user ticket stats:', error);
    return {
      totalEvents: 0,
      eventsThisYear: 0,
      eventsThisMonth: 0,
      favoriteCity: null,
      favoriteCategory: null,
      totalSpent: 0,
      averagePrice: 0,
      nextEvent: null,
    };
  }
};

export const getTicketsByMonth = async (): Promise<Record<string, number>> => {
  try {
    const tickets = await getUserTickets();
    const monthCount: Record<string, number> = {};

    tickets.forEach(ticket => {
      if (!ticket.event?.start_date) return;
      const date = new Date(ticket.event.start_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCount[monthKey] = (monthCount[monthKey] || 0) + 1;
    });

    return monthCount;
  } catch (error) {
    console.error('Error getting tickets by month:', error);
    return {};
  }
};

export const getEventsSoldTickets = async (eventId: string): Promise<TicketPurchase[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('ticket_purchases')
      .select(`
        *,
        ticket:event_tickets (
          ticket_type,
          description,
          price
        )
      `)
      .eq('event_id', eventId)
      .eq('payment_status', 'completed')
      .order('purchased_at', { ascending: false });

    if (error) {
      console.error('Error fetching sold tickets:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching sold tickets:', error);
    return [];
  }
};

export const getTotalTicketRevenue = async (userId: string): Promise<number> => {
  try {
    const { data: events } = await supabase
      .from('events')
      .select('id')
      .eq('user_id', userId);

    if (!events || events.length === 0) return 0;

    const eventIds = events.map(e => e.id);

    const { data: purchases } = await supabase
      .from('ticket_purchases')
      .select('total_price')
      .in('event_id', eventIds)
      .eq('payment_status', 'completed');

    if (!purchases || purchases.length === 0) return 0;

    return purchases.reduce((sum, p) => sum + p.total_price, 0);
  } catch (error) {
    console.error('Error getting total ticket revenue:', error);
    return 0;
  }
};

export interface EventTicketStats {
  eventId: string;
  totalTickets: number;
  soldTickets: number;
  availableTickets: number;
  revenue: number;
  ticketTypes: Array<{
    type: string;
    sold: number;
    available: number;
    revenue: number;
  }>;
}

export const getEventTicketStats = async (eventId: string): Promise<EventTicketStats | null> => {
  try {
    const tickets = await getEventTickets(eventId);
    const soldTickets = await getEventsSoldTickets(eventId);

    if (tickets.length === 0) return null;

    const totalTickets = tickets.reduce((sum, t) => sum + t.quantity_total, 0);
    const totalSold = tickets.reduce((sum, t) => sum + t.quantity_sold, 0);
    const availableTickets = totalTickets - totalSold;
    const revenue = soldTickets.reduce((sum, p) => sum + p.total_price, 0);

    const ticketTypes = tickets.map(ticket => {
      const ticketSales = soldTickets.filter(p => p.ticket_id === ticket.id);
      const sold = ticketSales.reduce((sum, p) => sum + p.quantity, 0);
      const ticketRevenue = ticketSales.reduce((sum, p) => sum + p.total_price, 0);

      return {
        type: ticket.ticket_type,
        sold,
        available: ticket.quantity_total - ticket.quantity_sold,
        revenue: ticketRevenue,
      };
    });

    return {
      eventId,
      totalTickets,
      soldTickets: totalSold,
      availableTickets,
      revenue,
      ticketTypes,
    };
  } catch (error) {
    console.error('Error getting event ticket stats:', error);
    return null;
  }
};
