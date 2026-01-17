import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, Spacing,  FontSizes,  FontWeights } from '../../constants';
import { router } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import EventCard from '../../components/EventCard';
import LogoComponent from '../../components/LogoComponent';
import EventDetailModal from '../../components/EventDetailModal';
import { AdMobBanner } from '../../components/AdMobBanner';
import { EventCardSkeleton } from '../../components/SkeletonLoader';
import { getHighlightEvents, getNearbyEvents } from '../../services/eventService';
import { getUserId } from '../../utils/userStorage';

export default function HomeScreen() {
  const [highlightEvents, setHighlightEvents] = useState<any[]>([]);
  const [nearbyEvents, setNearbyEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const userId = await getUserId();
      setCurrentUserId(userId);

      const [highlights, nearby] = await Promise.all([
        getHighlightEvents(),
        getNearbyEvents(userLocation?.lat, userLocation?.lon, 50)
      ]);

      setHighlightEvents(highlights);
      setNearbyEvents(nearby);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAllEvents = () => {
    router.push('/(tabs)/explore');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <LogoComponent width={200} height={80} />
          </View>
        </View>

        {/* Featured Events */}
        {!loading && highlightEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Highlights</Text>
              <TouchableOpacity onPress={handleViewAllEvents}>
                <Text style={styles.sectionLink}>Alle anzeigen</Text>
              </TouchableOpacity>
            </View>

            {highlightEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={async (e) => {
                  try {
                    const { getEventById } = await import('../../services/eventService');
                    const fullEvent = await getEventById(e.id);
                    if (fullEvent) {
                      setSelectedEvent({ ...e, ...fullEvent });
                      setShowEventDetail(true);
                    }
                  } catch (error) {
                    console.error('Error loading event details:', error);
                    setSelectedEvent(e);
                    setShowEventDetail(true);
                  }
                }}
              />
            ))}
          </View>
        )}

        {/* Events in deiner Nähe */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Events in deiner Nähe</Text>
            <TouchableOpacity onPress={handleViewAllEvents}>
              <Text style={styles.sectionLink}>Alle anzeigen</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <>
              <EventCardSkeleton />
              <EventCardSkeleton />
              <EventCardSkeleton />
            </>
          ) : (
            nearbyEvents.slice(0, 5).map((event) => (
              <EventCard
                key={event.id}
                event={event}
                showDistance={true}
                distance={event.distance || null}
                onPress={async (e) => {
                  try {
                    const { getEventById } = await import('../../services/eventService');
                    const fullEvent = await getEventById(e.id);
                    if (fullEvent) {
                      setSelectedEvent({ ...e, ...fullEvent });
                      setShowEventDetail(true);
                    }
                  } catch (error) {
                    console.error('Error loading event details:', error);
                    setSelectedEvent(e);
                    setShowEventDetail(true);
                  }
                }}
              />
            ))
          )}

          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={handleViewAllEvents}
          >
            <Text style={styles.viewAllButtonText}>Alle Events entdecken</Text>
          </TouchableOpacity>
        </View>

        {/* Location Info */}
        <View style={styles.locationInfo}>
          <MapPin size={16} color={Colors.gray500} />
          <Text style={styles.locationText}>
            Zeige Events in München und Umgebung
          </Text>
        </View>
      </ScrollView>

      {selectedEvent && (
        <EventDetailModal
          visible={showEventDetail}
          event={selectedEvent}
          onClose={() => {
            setShowEventDetail(false);
            setSelectedEvent(null);
          }}
          onEdit={() => {
            setShowEventDetail(false);
            router.push(`/edit-event?id=${selectedEvent.id}`);
          }}
          isOwnEvent={!!currentUserId && selectedEvent.user_id === currentUserId}
          onParticipationChange={() => {
            loadEvents();
          }}
        />
      )}

      <AdMobBanner position="bottom" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray200,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  header: {
    backgroundColor: Colors.gray800,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
    borderBottomWidth: 0,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    padding: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
  },
  sectionLink: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.primaryLight,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    borderRadius: 8,
  },
  locationText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    fontWeight: FontWeights.medium,
  },
  viewAllButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  viewAllButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
});