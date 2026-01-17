import { useState, useEffect } from 'react';
import { FavoriteEvent, Event } from '@/types';

// Global state for favorites (simulates persistent storage)
let globalFavorites: FavoriteEvent[] = [];
let listeners: (() => void)[] = [];

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

// Simulate localStorage for web compatibility
const saveToStorage = (favorites: FavoriteEvent[]) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem('jetzz-favorites', JSON.stringify(favorites));
    } catch (error) {
      console.warn('Could not save favorites to localStorage:', error);
    }
  }
};

const loadFromStorage = (): FavoriteEvent[] => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem('jetzz-favorites');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Could not load favorites from localStorage:', error);
    }
  }
  return [];
};

// Initialize favorites from storage
if (globalFavorites.length === 0) {
  globalFavorites = loadFromStorage();
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteEvent[]>(globalFavorites);

  useEffect(() => {
    const updateFavorites = () => {
      setFavorites([...globalFavorites]);
    };
    
    updateFavorites();
    listeners.push(updateFavorites);
    
    return () => {
      listeners = listeners.filter(listener => listener !== updateFavorites);
    };
  }, []);

  const addToFavorites = (event: Event) => {
    if (globalFavorites.some(fav => fav.id === event.id)) {
      return false; // Already exists
    }
    
    const newFavorite: FavoriteEvent = {
      ...event,
      addedAt: new Date().toISOString(),
    };
    
    globalFavorites = [...globalFavorites, newFavorite];
    saveToStorage(globalFavorites);
    notifyListeners();
    return true;
  };

  const removeFromFavorites = (eventId: number) => {
    const initialLength = globalFavorites.length;
    globalFavorites = globalFavorites.filter(fav => fav.id !== eventId);
    
    if (globalFavorites.length !== initialLength) {
      saveToStorage(globalFavorites);
      notifyListeners();
      return true;
    }
    return false;
  };

  const isFavorite = (eventId: number): boolean => {
    return globalFavorites.some(fav => fav.id === eventId);
  };

  const clearAllFavorites = () => {
    globalFavorites = [];
    saveToStorage(globalFavorites);
    notifyListeners();
  };

  const getFavoriteById = (eventId: number): FavoriteEvent | undefined => {
    return globalFavorites.find(fav => fav.id === eventId);
  };

  return {
    favorites: globalFavorites,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    clearAllFavorites,
    getFavoriteById,
    count: globalFavorites.length,
  };
}