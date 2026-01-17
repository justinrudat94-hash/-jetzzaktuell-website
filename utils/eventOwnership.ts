import { getUserId } from './userStorage';
import { getEventById } from '../services/eventService';

export const isEventOwner = async (eventId: string): Promise<boolean> => {
  try {
    const currentUserId = await getUserId();
    if (!currentUserId) {
      return false;
    }

    const event = await getEventById(eventId);
    if (!event) {
      return false;
    }

    return event.user_id === currentUserId;
  } catch (error) {
    console.error('Error checking event ownership:', error);
    return false;
  }
};

export const requireEventOwnership = async (
  eventId: string,
  onUnauthorized: () => void
): Promise<boolean> => {
  const isOwner = await isEventOwner(eventId);

  if (!isOwner) {
    onUnauthorized();
    return false;
  }

  return true;
};
