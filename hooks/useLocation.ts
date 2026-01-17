import { useState, useEffect } from 'react';
import { LocationData } from '@/types';

export interface LocationHookReturn {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => Promise<void>;
  hasPermission: boolean;
}

// Munich coordinates as default demo location
const DEMO_LOCATION: LocationData = {
  latitude: 48.1351,
  longitude: 11.5820,
  accuracy: 10,
};

export function useLocation(): LocationHookReturn {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  const requestLocation = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // For web compatibility, we simulate GPS location
      // In a real app, you would use expo-location here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setLocation(DEMO_LOCATION);
      setHasPermission(true);
      setError(null);
    } catch (err) {
      setError('Standort konnte nicht ermittelt werden');
      setLocation(DEMO_LOCATION); // Fallback to demo location
    } finally {
      setLoading(false);
    }
  };

  // Auto-request location on mount
  useEffect(() => {
    requestLocation();
  }, []);

  return {
    location,
    loading,
    error,
    requestLocation,
    hasPermission,
  };
}