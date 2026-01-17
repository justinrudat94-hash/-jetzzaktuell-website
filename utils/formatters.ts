export const formatAttendeesText = (count: number): string => {
  if (count <= 100) {
    return `${count} Teilnehmer`;
  } else if (count <= 150) {
    return `Über 100 Teilnehmer`;
  } else if (count <= 200) {
    return `Über 150 Teilnehmer`;
  } else {
    return `Über ${Math.floor(count / 100) * 100} Teilnehmer`;
  }
};

export const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m entfernt`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)}km entfernt`;
  } else {
    return `${Math.round(distance)}km entfernt`;
  }
};

export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Gerade eben';
  if (diffInMinutes < 60) return `vor ${diffInMinutes}m`;
  if (diffInMinutes < 1440) return `vor ${Math.floor(diffInMinutes / 60)}h`;
  return `vor ${Math.floor(diffInMinutes / 1440)}d`;
};

export const formatAddedDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Heute hinzugefügt';
  if (diffInDays === 1) return 'Gestern hinzugefügt';
  if (diffInDays < 7) return `Vor ${diffInDays} Tagen hinzugefügt`;
  
  return `Hinzugefügt am ${date.toLocaleDateString('de-DE')}`;
};

export const formatPrice = (price: string | number | null | undefined, externalSource?: string, isFree?: boolean): string | null => {
  if (externalSource === 'ticketmaster' || externalSource === 'eventbrite') {
    return null;
  }

  if (isFree === true) {
    return 'Kostenlos';
  }

  if (typeof price === 'number') {
    if (price === 0) {
      return 'Kostenlos';
    }
    return `${price.toFixed(2)}€`;
  }

  if (typeof price === 'string') {
    const trimmedPrice = price.trim();
    const numericPrice = parseFloat(trimmedPrice);

    if (!isNaN(numericPrice)) {
      if (numericPrice === 0) {
        return 'Kostenlos';
      }
      return `${numericPrice.toFixed(2)}€`;
    }

    if (trimmedPrice.toLowerCase().includes('kostenlos')) {
      return 'Kostenlos';
    }

    return trimmedPrice;
  }

  return 'Preis auf Anfrage';
};

export const getTicketButtonText = (externalSource?: string, ticketUrl?: string): string | null => {
  if (externalSource === 'ticketmaster') return 'Tickets bei Ticketmaster';
  if (externalSource === 'eventbrite') return 'Tickets bei Eventbrite';
  if (ticketUrl && !externalSource) return 'Tickets kaufen';
  if (ticketUrl) return 'Tickets kaufen';

  return null;
};

export const formatEventTime = (time: string | undefined, date: string | undefined, endTime?: string): string => {
  if (!date && !time) return '';

  const eventDate = new Date(date || '');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = eventDate.toDateString() === today.toDateString();
  const isTomorrow = eventDate.toDateString() === tomorrow.toDateString();

  const formattedTime = time ? (time.length > 5 ? time.substring(0, 5) : time) : '';
  const formattedEndTime = endTime ? (endTime.length > 5 ? endTime.substring(0, 5) : endTime) : '';

  const timeDisplay = formattedEndTime && formattedTime !== formattedEndTime
    ? `${formattedTime} - ${formattedEndTime}`
    : formattedTime
      ? `ab ${formattedTime}`
      : '';

  if (isToday) {
    return `Heute ${timeDisplay}`.trim();
  } else if (isTomorrow) {
    return `Morgen ${timeDisplay}`.trim();
  } else {
    return `${eventDate.toLocaleDateString('de-DE')} ${timeDisplay}`.trim();
  }
};