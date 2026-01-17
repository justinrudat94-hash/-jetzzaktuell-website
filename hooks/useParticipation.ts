import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/utils/userStorage';

let globalParticipation: Set<string> = new Set();
let listeners: (() => void)[] = [];
let isInitialized = false;

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

const loadParticipationFromDB = async (): Promise<Set<string>> => {
  try {
    const userId = await getUserId();
    if (!userId) {
      return new Set();
    }

    const { data, error } = await supabase
      .from('event_participants')
      .select('event_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error loading participation:', error);
      return new Set();
    }

    return new Set((data || []).map(p => p.event_id));
  } catch (error) {
    console.error('Error loading participation:', error);
    return new Set();
  }
};

export function useParticipation() {
  const [participation, setParticipation] = useState<Set<string>>(globalParticipation);
  const [loading, setLoading] = useState(!isInitialized);

  useEffect(() => {
    const initializeParticipation = async () => {
      if (!isInitialized) {
        globalParticipation = await loadParticipationFromDB();
        isInitialized = true;
        setLoading(false);
        notifyListeners();
      }
    };

    initializeParticipation();

    const updateParticipation = () => {
      setParticipation(new Set(globalParticipation));
    };

    updateParticipation();
    listeners.push(updateParticipation);

    return () => {
      listeners = listeners.filter(listener => listener !== updateParticipation);
    };
  }, []);

  const addParticipation = async (eventId: string): Promise<boolean> => {
    try {
      if (globalParticipation.has(eventId)) {
        return false;
      }

      const userId = await getUserId();
      if (!userId) {
        console.error('No user ID found');
        return false;
      }

      const { error } = await supabase
        .from('event_participants')
        .insert({
          event_id: eventId,
          user_id: userId,
        });

      if (error) {
        console.error('Error adding participation:', error);
        return false;
      }

      globalParticipation.add(eventId);
      notifyListeners();
      return true;
    } catch (error) {
      console.error('Error adding participation:', error);
      return false;
    }
  };

  const removeParticipation = async (eventId: string): Promise<boolean> => {
    try {
      const userId = await getUserId();
      if (!userId) {
        console.error('No user ID found');
        return false;
      }

      const { error } = await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing participation:', error);
        return false;
      }

      globalParticipation.delete(eventId);
      notifyListeners();
      return true;
    } catch (error) {
      console.error('Error removing participation:', error);
      return false;
    }
  };

  const isParticipating = (eventId: string): boolean => {
    return globalParticipation.has(eventId);
  };

  const toggleParticipation = async (eventId: string): Promise<boolean> => {
    if (globalParticipation.has(eventId)) {
      await removeParticipation(eventId);
      return false;
    } else {
      await addParticipation(eventId);
      return true;
    }
  };

  const clearAllParticipation = async (): Promise<void> => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const { error } = await supabase
        .from('event_participants')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error clearing participation:', error);
        return;
      }

      globalParticipation.clear();
      notifyListeners();
    } catch (error) {
      console.error('Error clearing participation:', error);
    }
  };

  return {
    participation: globalParticipation,
    addParticipation,
    removeParticipation,
    isParticipating,
    toggleParticipation,
    clearAllParticipation,
    count: globalParticipation.size,
    loading,
  };
}