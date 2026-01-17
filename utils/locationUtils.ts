import { LocationData } from '@/types';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) *
      Math.cos(toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Filter events by distance from user location
 */
export function filterEventsByDistance<T extends { coordinates?: Coordinates }>(
  events: T[],
  userLocation: LocationData,
  maxDistance: number
): (T & { distance: number })[] {
  return events
    .filter(event => event.coordinates) // Only events with coordinates
    .map(event => ({
      ...event,
      distance: calculateDistance(userLocation, event.coordinates!),
    }))
    .filter(event => event.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Generate random coordinates around Munich for demo purposes
 */
export function generateMunichCoordinates(): Coordinates {
  const munichCenter = { latitude: 48.1351, longitude: 11.5820 };
  const radius = 0.05; // ~5km radius
  
  const randomLat = munichCenter.latitude + (Math.random() - 0.5) * radius;
  const randomLng = munichCenter.longitude + (Math.random() - 0.5) * radius;
  
  return {
    latitude: randomLat,
    longitude: randomLng,
  };
}

/**
 * Check if coordinates are within Germany (rough bounds)
 */
export function isInGermany(coordinates: Coordinates): boolean {
  const { latitude, longitude } = coordinates;
  
  // Rough bounds of Germany
  const bounds = {
    north: 55.1,
    south: 47.3,
    east: 15.0,
    west: 5.9,
  };
  
  return (
    latitude >= bounds.south &&
    latitude <= bounds.north &&
    longitude >= bounds.west &&
    longitude <= bounds.east
  );
}