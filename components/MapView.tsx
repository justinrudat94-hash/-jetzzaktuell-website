import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import { MapPin, Calendar, Users, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';
import { LocationData } from '../types';

interface MapEvent {
  id: string;
  title: string;
  category: string;
  date: string;
  time: string;
  location: string;
  image: string;
  attendees: number;
  coordinates: { latitude: number; longitude: number };
  distance?: number;
}

interface MapViewProps {
  events: MapEvent[];
  userLocation: LocationData | null;
  onEventSelect?: (event: MapEvent) => void;
  selectedEventId?: string | null;
  fullscreen?: boolean;
}

export type { MapEvent };

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = 300;

const getCategoryIcon = (category: string) => {
  const icons: { [key: string]: string } = {
    Essen: '🍔',
    Party: '🎶',
    Auto: '🚗',
    Kino: '🎬',
    Sport: '🏟️',
    Konzert: '🎵',
    Festival: '🎪',
    Kultur: '🎭',
  };
  return icons[category] || '📍';
};

const getCategoryColor = (category: string) => {
  const colors: { [key: string]: string } = {
    Essen: '#FF6B6B',
    Party: '#9B59B6',
    Auto: '#3498DB',
    Kino: '#E74C3C',
    Sport: '#2ECC71',
    Konzert: '#F39C12',
    Festival: '#E91E63',
    Kultur: '#00BCD4',
  };
  return colors[category] || Colors.primary;
};

let MapContainer: any;
let TileLayer: any;
let Marker: any;
let Popup: any;
let useMap: any;
let L: any;

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const leaflet = require('react-leaflet');
  MapContainer = leaflet.MapContainer;
  TileLayer = leaflet.TileLayer;
  Marker = leaflet.Marker;
  Popup = leaflet.Popup;
  useMap = leaflet.useMap;
  L = require('leaflet');
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  if (Platform.OS !== 'web' || !useMap) return null;

  const map = useMap();

  useEffect(() => {
    if (map) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);

  return null;
}

export default function MapView({ events, userLocation, onEventSelect, selectedEventId, fullscreen = false }: MapViewProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsClient(true);

    if (Platform.OS === 'web') {
      const existingLink = document.querySelector('link[href*="leaflet.css"]');
      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (L && L.Icon && L.Icon.Default) {
        try {
          delete (L.Icon.Default.prototype as any)._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          });
        } catch (e) {
          console.warn('Could not configure Leaflet icons:', e);
        }
      }
    }
  }, []);

  const handleMarkerPress = (event: MapEvent) => {
    if (onEventSelect) {
      onEventSelect(event);
    }
  };

  const center: [number, number] = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : [48.1351, 11.5820];

  if (Platform.OS !== 'web' || !isClient || !MapContainer) {
    return (
      <View style={fullscreen ? styles.containerFullscreen : styles.container}>
        <View style={fullscreen ? styles.mapBackgroundFullscreen : styles.mapBackground}>
          <View style={styles.placeholderContainer}>
            <MapPin size={48} color={Colors.primary} />
            <Text style={styles.placeholderText}>
              {!isClient ? 'Karte wird geladen...' : 'Karte ist nur im Browser verfügbar'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const createCustomIcon = (category: string, isSelected: boolean) => {
    if (!L || !L.divIcon) return null;

    const color = getCategoryColor(category);
    const icon = getCategoryIcon(category);
    const scale = isSelected ? 1.2 : 1;

    return L.divIcon({
      html: `
        <div style="
          width: ${40 * scale}px;
          height: ${40 * scale}px;
          background-color: ${color};
          border-radius: 50%;
          border: 3px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${20 * scale}px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: pointer;
          transform: translate(-50%, -50%);
        ">
          ${icon}
        </div>
      `,
      className: 'custom-marker',
      iconSize: [40 * scale, 40 * scale],
      iconAnchor: [20 * scale, 20 * scale],
    });
  };

  return (
    <View style={fullscreen ? styles.containerFullscreen : styles.container}>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        zoomControl={true}
      >
        <MapUpdater center={center} zoom={12} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLocation && (
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={L && L.divIcon ? L.divIcon({
              html: `
                <div style="
                  width: 24px;
                  height: 24px;
                  position: relative;
                ">
                  <div style="
                    width: 16px;
                    height: 16px;
                    background-color: ${Colors.primary};
                    border-radius: 50%;
                    border: 3px solid white;
                    position: absolute;
                    top: 4px;
                    left: 4px;
                    z-index: 2;
                  "></div>
                  <div style="
                    width: 24px;
                    height: 24px;
                    background-color: ${Colors.primary};
                    border-radius: 50%;
                    opacity: 0.3;
                    position: absolute;
                    top: 0;
                    left: 0;
                  "></div>
                </div>
              `,
              className: 'user-marker',
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            }) : undefined}
          >
            <Popup>
              <div style={{ padding: '8px', textAlign: 'center' }}>
                <strong>Dein Standort</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {events.slice(0, 50).map((event) => {
          const isSelected = selectedEventId === event.id;
          const icon = createCustomIcon(event.category, isSelected);

          return (
            <Marker
              key={event.id}
              position={[event.coordinates.latitude, event.coordinates.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => handleMarkerPress(event),
              }}
            >
              <Popup>
                <div style={{ padding: '8px', minWidth: '200px' }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: Colors.primary,
                    textTransform: 'uppercase',
                    marginBottom: '4px'
                  }}>
                    {event.category}
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '8px'
                  }}>
                    {event.title}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: Colors.gray600,
                    marginBottom: '4px'
                  }}>
                    📅 {event.date} • {event.time}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: Colors.gray600,
                    marginBottom: '4px'
                  }}>
                    📍 {event.location}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: Colors.gray600,
                    marginBottom: '8px'
                  }}>
                    👥 {event.attendees} Teilnehmer
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </View>
  );
}

export function MapViewSelectedEvent({ event, onClose, onDetailsPress }: {
  event: MapEvent;
  onClose: () => void;
  onDetailsPress: () => void;
}) {
  const eventImage = event.image || event.preview_image_url || event.image_url || 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg';

  return (
    <View style={styles.popupContainer}>
      <View style={styles.popup}>
        <TouchableOpacity
          style={styles.popupClose}
          onPress={onClose}
        >
          <X size={20} color={Colors.gray600} />
        </TouchableOpacity>

        <Image source={{ uri: eventImage }} style={styles.popupImage} />

        <View style={styles.popupContent}>
          <View style={styles.popupHeader}>
            <Text style={styles.popupCategory}>{event.category}</Text>
            {event.distance !== undefined && (
              <Text style={styles.popupDistance}>
                {event.distance < 1
                  ? `${Math.round(event.distance * 1000)}m`
                  : `${event.distance.toFixed(1)}km`}
              </Text>
            )}
          </View>

          <Text style={styles.popupTitle} numberOfLines={2}>
            {event.title}
          </Text>

          <View style={styles.popupDetails}>
            <View style={styles.popupDetailRow}>
              <Calendar size={14} color={Colors.gray600} />
              <Text style={styles.popupDetailText}>
                {event.date} • {event.time}
              </Text>
            </View>

            <View style={styles.popupDetailRow}>
              <MapPin size={14} color={Colors.gray600} />
              <Text style={styles.popupDetailText}>{event.location}</Text>
            </View>

            <View style={styles.popupDetailRow}>
              <Users size={14} color={Colors.gray600} />
              <Text style={styles.popupDetailText}>
                {event.attendees} Teilnehmer
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.detailsButton} onPress={onDetailsPress}>
            <Text style={styles.detailsButtonText}>Details ansehen</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: MAP_HEIGHT,
    position: 'relative',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.gray300,
  },
  containerFullscreen: {
    flex: 1,
    position: 'relative',
  },
  mapBackground: {
    height: MAP_HEIGHT,
    backgroundColor: '#E8F4F8',
    position: 'relative',
    borderRadius: BorderRadius.lg,
  },
  mapBackgroundFullscreen: {
    flex: 1,
    backgroundColor: '#E8F4F8',
    position: 'relative',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  placeholderText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
  },
  popupContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  popup: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.gray800,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },
  popupClose: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: Colors.gray800,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  popupImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  popupContent: {
    padding: Spacing.lg,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  popupCategory: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  popupDistance: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.secondary,
  },
  popupTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  popupDetails: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  popupDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  popupDetailText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  detailsButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
});
