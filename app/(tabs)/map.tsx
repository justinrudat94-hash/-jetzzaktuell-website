import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Filter } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants';
import FilterOverlay from '../../components/FilterOverlay';

// Mock event data for map markers
const mapEvents = [
  {
    id: 1,
    title: 'Stadtfest München',
    date: '2024-12-20',
    time: '14:00',
    image: 'https://images.pexels.com/photos/976866/pexels-photo-976866.jpeg',
    coordinates: { x: 120, y: 180 }, // Simulated map coordinates
  },
  {
    id: 2,
    title: 'Live Jazz im Park',
    date: '2024-12-20',
    time: '19:30',
    image: 'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg',
    coordinates: { x: 200, y: 250 },
  },
  {
    id: 3,
    title: 'Food Truck Festival',
    date: '2024-12-21',
    time: '12:00',
    image: 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg',
    coordinates: { x: 160, y: 320 },
  },
  {
    id: 4,
    title: 'After Work Party',
    date: '2024-12-20',
    time: '17:00',
    image: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg',
    coordinates: { x: 280, y: 200 },
  },
];

export default function MapPage() {
  const [selectedEvent, setSelectedEvent] = useState<typeof mapEvents[0] | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);

  const handleMarkerPress = (event: typeof mapEvents[0]) => {
    setSelectedEvent(event);
  };

  const handleCalloutPress = () => {
    if (selectedEvent) {
      router.push(`/event/${selectedEvent.id}`);
    }
  };

  const handleFilterPress = () => {
    setFilterVisible(true);
  };

  const handleApplyFilters = (filters: any) => {
    console.log('Applied filters:', filters);
    // Here you would filter the mapEvents based on the selected filters
  };

  const formatEventDate = (date: string, time: string) => {
    const eventDate = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = eventDate.toDateString() === today.toDateString();
    const isTomorrow = eventDate.toDateString() === tomorrow.toDateString();
    
    if (isToday) {
      return `Heute ${time}`;
    } else if (isTomorrow) {
      return `Morgen ${time}`;
    } else {
      return `${eventDate.toLocaleDateString('de-DE')} ${time}`;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* AppBar */}
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>Events auf der Karte</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={handleFilterPress}
        >
          <Filter size={20} color={Colors.gray700} />
        </TouchableOpacity>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        {/* Map Placeholder */}
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderText}>🗺️</Text>
          <Text style={styles.mapPlaceholderTitle}>Interaktive Karte</Text>
          <Text style={styles.mapPlaceholderSubtext}>
            Google Maps würde hier angezeigt werden
          </Text>
        </View>

        {/* Event Markers */}
        {mapEvents.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={[
              styles.eventMarker,
              {
                left: event.coordinates.x,
                top: event.coordinates.y,
              },
            ]}
            onPress={() => handleMarkerPress(event)}
          >
            <View style={styles.markerDot} />
          </TouchableOpacity>
        ))}

        {/* Callout Popup */}
        {selectedEvent && (
          <TouchableOpacity
            style={[
              styles.calloutPopup,
              {
                left: selectedEvent.coordinates.x - 75, // Center popup on marker
                top: selectedEvent.coordinates.y - 120, // Position above marker
              },
            ]}
            onPress={handleCalloutPress}
            activeOpacity={0.8}
          >
            <Image 
              source={{ uri: selectedEvent.image }} 
              style={styles.calloutImage} 
            />
            <View style={styles.calloutContent}>
              <Text style={styles.calloutTitle} numberOfLines={2}>
                {selectedEvent.title}
              </Text>
              <Text style={styles.calloutDateTime}>
                {formatEventDate(selectedEvent.date, selectedEvent.time)}
              </Text>
            </View>
            <View style={styles.calloutArrow} />
          </TouchableOpacity>
        )}

        {/* Tap outside to close callout */}
        {selectedEvent && (
          <TouchableOpacity
            style={styles.overlay}
            onPress={() => setSelectedEvent(null)}
            activeOpacity={1}
          />
        )}
      </View>

      {/* Filter Overlay */}
      <FilterOverlay
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApplyFilters={handleApplyFilters}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray200,
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  appBarTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
  },
  filterButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
  },
  mapPlaceholderText: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  mapPlaceholderTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: Spacing.sm,
  },
  mapPlaceholderSubtext: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
  },
  eventMarker: {
    position: 'absolute',
    zIndex: 10,
  },
  markerDot: {
    width: 20,
    height: 20,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  calloutPopup: {
    position: 'absolute',
    width: 150,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 20,
  },
  calloutImage: {
    width: '100%',
    height: 80,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    resizeMode: 'cover',
  },
  calloutContent: {
    padding: Spacing.md,
  },
  calloutTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: 4,
    lineHeight: 18,
  },
  calloutDateTime: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    fontWeight: FontWeights.medium,
  },
  calloutArrow: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.surface,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 15,
  },
});