import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Heart } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';
import EventCard from '../components/EventCard';
import EventDetailModal from '../components/EventDetailModal';
import { getUserLikes } from '../services/likeService';
import { getEventById } from '../services/eventService';
import { getUserId } from '../utils/userStorage';
import { supabase } from '../lib/supabase';
import { Event } from '../types';

export default function FavoritesScreen() {
  const [likedEvents, setLikedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadLikedEvents();
  }, []);

  const loadLikedEvents = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLikedEvents([]);
        setLoading(false);
        return;
      }

      const userId = await getUserId();
      setCurrentUserId(userId);

      const likes = await getUserLikes(user.id, 'event');

      if (likes.length === 0) {
        setLikedEvents([]);
        setLoading(false);
        return;
      }

      const eventIds = likes.map(like => like.target_id);
      const today = new Date().toISOString().split('T')[0];

      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds)
        .gte('start_date', today)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading liked events:', error);
        setLikedEvents([]);
      } else {
        setLikedEvents(events || []);
      }
    } catch (error) {
      console.error('Error in loadLikedEvents:', error);
      setLikedEvents([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.gray800} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gefällt mir</Text>
          <View style={styles.clearButton} />
        </View>

        {/* Count */}
        <View style={styles.countSection}>
          <Text style={styles.countText}>
            {likedEvents.length} {likedEvents.length === 1 ? 'Event' : 'Events'}
          </Text>
        </View>

        {/* Events List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : likedEvents.length > 0 ? (
          <View style={styles.eventsContainer}>
            {likedEvents.map((event) => (
              <View key={event.id} style={styles.favoriteItem}>
                <EventCard
                  event={event}
                  onPress={async (e) => {
                    try {
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
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Heart size={64} color={Colors.gray400} />
            <Text style={styles.emptyStateTitle}>Noch keine Likes</Text>
            <Text style={styles.emptyStateText}>
              Like Events um sie hier zu sehen
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <Text style={styles.exploreButtonText}>Events entdecken</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {selectedEvent && (
        <EventDetailModal
          visible={showEventDetail}
          event={selectedEvent}
          onClose={() => {
            setShowEventDetail(false);
            setSelectedEvent(null);
          }}
          isOwnEvent={!!currentUserId && selectedEvent.user_id === currentUserId}
          onParticipationChange={() => {
            loadLikedEvents();
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray200,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
  },
  clearButton: {
    padding: 4,
    width: 28,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.massive * 2,
  },
  countSection: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  countText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray600,
  },
  eventsContainer: {
    padding: Spacing.xl,
  },
  favoriteItem: {
    marginBottom: Spacing.lg,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.huge,
    paddingVertical: Spacing.massive * 2,
  },
  emptyStateTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xxl,
  },
  exploreButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 25,
  },
  exploreButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
});