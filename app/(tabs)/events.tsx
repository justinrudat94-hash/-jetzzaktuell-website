import React, { useState, useRef, useEffect } from 'react';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Pressable, TextInput, Image, Alert, Animated, ActivityIndicator, Modal } from 'react-native';
import { Colors, Spacing,  FontSizes,  FontWeights,  BorderRadius } from '../../constants';
import { router } from 'expo-router';
import { Plus, Search, Calendar, Clock, Users, MapPin, MoreVertical, Edit2, Trash2, Share, Heart, UserCheck, UserX } from 'lucide-react-native';
import { useParticipation } from '../../hooks/useParticipation';
import { getUserEvents, deleteEvent } from '../../services/eventService';
import { getUserId } from '../../utils/userStorage';
import { getUserLikes } from '../../services/likeService';
import { supabase } from '../../lib/supabase';
import AdBanner from '../../components/AdBanner';
import EventDetailModal from '../../components/EventDetailModal';
import { Event } from '../../types';

type TabFilter = 'Kommend' | 'Erstellt' | 'Gefällt mir' | 'Vergangen';

interface UserEvent {
  id: number;
  realId?: string;
  title: string;
  date: string;
  time: string;
  location: string;
  address: string;
  image: string;
  attendees: number;
  status: 'upcoming' | 'past';
  type: 'created' | 'participating';
  participants: Array<{
    id: number;
    name: string;
    avatar?: string;
  }>;
  isParticipating?: boolean;
}

export default function EventsScreen() {
  const { tab } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<TabFilter>('Kommend');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOptionsMenu, setShowOptionsMenu] = useState<number | null>(null);
  const [showBanner, setShowBanner] = useState(Math.random() > 0.5);
  const [likedEvents, setLikedEvents] = useState<Event[]>([]);
  const [likedEventIds, setLikedEventIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<{ id: number; realId: string } | null>(null);
  const { isParticipating, toggleParticipation } = useParticipation();
  const [userEvents, setUserEvents] = useState<UserEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<UserEvent | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;
  const tabsOpacity = useRef(new Animated.Value(1)).current;
  const tabsHeight = useRef(new Animated.Value(160)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;

        if (offsetY <= 10) {
          Animated.parallel([
            Animated.timing(tabsOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: false,
            }),
            Animated.timing(tabsHeight, {
              toValue: 160,
              duration: 200,
              useNativeDriver: false,
            }),
          ]).start();
        } else if (offsetY > 50) {
          Animated.parallel([
            Animated.timing(tabsOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false,
            }),
            Animated.timing(tabsHeight, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false,
            }),
          ]).start();
        }
      },
    }
  );

  const loadUserEvents = async () => {
    setLoading(true);
    try {
      const userId = await getUserId();
      if (!userId) {
        console.log('No user ID found');
        setUserEvents([]);
        return;
      }

      setCurrentUserId(userId);

      const createdEvents = await getUserEvents(userId);

      const { data: participatingData, error: participatingError } = await supabase
        .from('event_participants')
        .select('event_id, events(*)')
        .eq('user_id', userId);

      if (participatingError) {
        console.error('Error loading participating events:', participatingError);
      }

      const participatingEvents = (participatingData || [])
        .map(p => p.events)
        .filter(Boolean);

      const allEvents: UserEvent[] = [
        ...createdEvents.map(event => {
          const eventDateTime = new Date(`${event.start_date}T${event.start_time || '00:00'}`);
          const now = new Date();
          return {
            id: event.id,
            realId: event.id,
            title: event.title,
            date: event.start_date,
            time: event.start_time || '00:00',
            location: event.city || event.location || 'Ort nicht angegeben',
            address: [event.street, event.postcode, event.city].filter(Boolean).join(', ') || event.location,
            image: event.preview_image_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg',
            attendees: event.current_participants || 0,
            status: eventDateTime > now ? 'upcoming' : 'past',
            type: 'created' as const,
            participants: [],
            isParticipating: false,
          };
        }),
        ...participatingEvents.map((event: any) => {
          const eventDateTime = new Date(`${event.start_date}T${event.start_time || '00:00'}`);
          const now = new Date();
          return {
            id: event.id,
            realId: event.id,
            title: event.title,
            date: event.start_date,
            time: event.start_time || '00:00',
            location: event.city || event.location || 'Ort nicht angegeben',
            address: [event.street, event.postcode, event.city].filter(Boolean).join(', ') || event.location,
            image: event.preview_image_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg',
            attendees: event.current_participants || 0,
            status: eventDateTime > now ? 'upcoming' : 'past',
            type: 'participating' as const,
            participants: [],
            isParticipating: true,
          };
        }),
      ];

      setUserEvents(allEvents);
    } catch (error) {
      console.error('Error loading events:', error);
      setUserEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLikedEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLikedEvents([]);
        setLikedEventIds(new Set());
        return;
      }

      const likes = await getUserLikes(user.id, 'event');
      const eventIds = likes.map(like => like.target_id);
      setLikedEventIds(new Set(eventIds));

      if (likes.length === 0) {
        setLikedEvents([]);
        return;
      }

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
      setLikedEventIds(new Set());
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadUserEvents();
      loadLikedEvents();
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
    }, [])
  );

  React.useEffect(() => {
    if (tab && typeof tab === 'string') {
      const validTabs: TabFilter[] = ['Kommend', 'Erstellt', 'Gefällt mir', 'Vergangen'];
      if (validTabs.includes(tab as TabFilter)) {
        setActiveTab(tab as TabFilter);
      }
    }
  }, [tab]);

  // Helper function to get dynamic attendee count
  const getDynamicAttendeeCount = (event: UserEvent) => {
    return event.attendees;
  };

  const handleCreateEvent = () => {
    router.push('/create-event');
  };

  const handleViewFavorites = () => {
    setActiveTab('Gefällt mir');
  };

  const handleEventPress = async (event: UserEvent) => {
    try {
      const { getEventById } = await import('../../services/eventService');
      const fullEvent = await getEventById(event.realId!);
      if (fullEvent) {
        setSelectedEvent({ ...event, ...fullEvent } as any);
        setShowEventDetail(true);
      }
    } catch (error) {
      console.error('Error loading event details:', error);
      setSelectedEvent(event);
      setShowEventDetail(true);
    }
  };

  const handleEditEvent = () => {
    setShowEventDetail(false);
    if (selectedEvent?.realId) {
      router.push(`/edit-event?id=${selectedEvent.realId}`);
    }
  };


  const handleParticipationToggle = async (eventId: string) => {
    const event = userEvents.find(e => e.realId === eventId);
    if (!event) return;

    if (event.type === 'created') {
      Alert.alert('Info', 'Du kannst nicht an deinen eigenen Events teilnehmen.');
      return;
    }

    const nowParticipating = await toggleParticipation(eventId);

    if (nowParticipating) {
      Alert.alert('Angemeldet', 'Du hast dich für dieses Event angemeldet!');
    } else {
      Alert.alert('Abgemeldet', 'Du hast dich von diesem Event abgemeldet.');
    }

    await loadUserEvents();
  };

  // Filter events based on active tab and search query
  const filteredEvents = userEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    switch (activeTab) {
      case 'Kommend':
        return event.status === 'upcoming';
      case 'Erstellt':
        return event.type === 'created' && event.status === 'upcoming';
      case 'Vergangen':
        return event.status === 'past';
      default:
        return true;
    }
  });

  // Tab-unabhängige Zähler für die Tab-Buttons
  const allCreatedEventsCount = userEvents.filter(event =>
    event.type === 'created' &&
    event.status === 'upcoming' &&
    (event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     event.location.toLowerCase().includes(searchQuery.toLowerCase()))
  ).length;

  const allUpcomingEventsCount = userEvents.filter(event =>
    (event.status === 'upcoming' || (event.type === 'participating' && isParticipating(event.id) && new Date(event.date) > new Date())) &&
    (event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     event.location.toLowerCase().includes(searchQuery.toLowerCase()))
  ).length;

  const allPastEventsCount = userEvents.filter(event =>
    event.status === 'past' &&
    (event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     event.location.toLowerCase().includes(searchQuery.toLowerCase()))
  ).length;

  // Tab-abhängige gefilterte Events für die Anzeige
  const createdEvents = filteredEvents.filter(event => event.type === 'created');
  const upcomingCreatedEvents = createdEvents.filter(event => event.status === 'upcoming');
  const pastCreatedEvents = createdEvents.filter(event => event.status === 'past');
  const participatingEventsFiltered = filteredEvents.filter(event => event.type === 'participating' || isParticipating(event.id));
  const upcomingEvents = filteredEvents.filter(event =>
    event.status === 'upcoming' || (event.type === 'participating' && isParticipating(event.id) && new Date(event.date) > new Date())
  );
  const pastEvents = filteredEvents.filter(event => event.status === 'past');
  
  // Filter liked events based on search
  const filteredLikedEvents = likedEvents.filter(event =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOptionsPress = (eventId: number) => {
    console.log('Options pressed for event:', eventId);
    setShowOptionsMenu(showOptionsMenu === eventId ? null : eventId);
  };

  const handleEditEventFromMenu = (eventId: number) => {
    console.log('Edit event from menu:', eventId);
    setShowOptionsMenu(null);
    const event = userEvents.find(e => e.id === eventId);
    console.log('Found event:', event);
    if (event?.realId) {
      console.log('Navigating to edit-event with id:', event.realId);
      router.push(`/edit-event?id=${event.realId}`);
    } else {
      console.log('No realId found for event');
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    console.log('Delete event:', eventId);
    setShowOptionsMenu(null);
    const event = userEvents.find(e => e.id === eventId);
    console.log('Found event for delete:', event);
    if (!event?.realId) {
      console.log('No realId found, returning');
      return;
    }

    setEventToDelete({ id: eventId, realId: event.realId });
    setShowDeleteDialog(true);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;

    try {
      setLoading(true);
      setShowDeleteDialog(false);
      await deleteEvent(eventToDelete.realId);

      setUserEvents(prev => prev.filter(e => e.id !== eventToDelete.id));

      Alert.alert('Erfolg', 'Event wurde erfolgreich gelöscht');
    } catch (error) {
      console.error('Error deleting event:', error);
      Alert.alert('Fehler', 'Event konnte nicht gelöscht werden. Bitte versuche es später erneut.');
    } finally {
      setLoading(false);
      setEventToDelete(null);
    }
  };

  const handleShareEvent = (eventId: number) => {
    console.log('Share event:', eventId);
    setShowOptionsMenu(null);
    Alert.alert('Event teilen', `Event ${eventId} teilen (Demo)`);
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

  const renderEventCard = (event: UserEvent) => {
    const eventImage = event.image || event.preview_image_url || event.image_url || 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg';

    return (
      <View key={event.id} style={styles.eventCard}>
        <TouchableOpacity onPress={() => handleEventPress(event)} activeOpacity={0.8}>
          {/* Event Image */}
          <View style={styles.eventImageContainer}>
            <Image source={{ uri: eventImage }} style={styles.eventImage} />
          
          {/* Like Button */}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={async () => {
              const isLiked = likedEventIds.has(event.realId || '');
              const { toggleLike } = await import('../../services/likeService');
              await toggleLike('event', event.realId || '');

              // Update local state
              const newLikedIds = new Set(likedEventIds);
              if (isLiked) {
                newLikedIds.delete(event.realId || '');
              } else {
                newLikedIds.add(event.realId || '');
              }
              setLikedEventIds(newLikedIds);

              // Reload liked events for the tab
              loadLikedEvents();
            }}
          >
            <Heart
              size={20}
              color={likedEventIds.has(event.realId || '') ? Colors.error : Colors.white}
              fill={likedEventIds.has(event.realId || '') ? Colors.error : 'none'}
            />
          </TouchableOpacity>

          {/* Status Badge */}
          <View style={[
            styles.statusBadge,
            event.status === 'upcoming' ? styles.upcomingBadge : styles.pastBadge
          ]}>
            <Text style={[
              styles.statusText,
              event.status === 'upcoming' ? styles.upcomingText : styles.pastText
            ]}>
              {getDynamicAttendeeCount(event)} Teilnehmer
            </Text>
          </View>

          {/* Options Menu - nur für "Erstellt" Tab */}
          {event.type === 'created' && (
            <TouchableOpacity
              style={styles.optionsButton}
              onPress={() => handleOptionsPress(event.id)}
            >
              <MoreVertical size={20} color={Colors.white} />
            </TouchableOpacity>
          )}
        </View>

        {/* Event Content */}
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {event.title}
          </Text>
          
          <View style={styles.eventDetails}>
            <View style={styles.eventDetail}>
              <Calendar size={14} color={Colors.gray500} />
              <Text style={styles.eventDetailText}>
                {formatEventDate(event.date, event.time)}
              </Text>
            </View>
            
            <View style={styles.eventDetail}>
              <MapPin size={14} color={Colors.gray500} />
              <Text style={styles.eventDetailText} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
          </View>

          {/* Participants */}
          <View style={styles.participantsSection}>
            <View style={styles.participantAvatars}>
              {event.participants.slice(0, 3).map((participant, index) => (
                <View key={participant.id} style={[styles.participantAvatar, { marginLeft: index > 0 ? -8 : 0 }]}>
                  <Text style={styles.participantInitial}>
                    {participant.name.charAt(0)}
                  </Text>
                </View>
              ))}
              {event.participants.length > 3 && (
                <View style={[styles.participantAvatar, styles.moreParticipants, { marginLeft: -8 }]}>
                  <Text style={styles.moreParticipantsText}>
                    +{event.participants.length - 3}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.participantInfo}>
              <Text style={styles.participantCount}>
                {getDynamicAttendeeCount(event)} Teilnehmer
              </Text>
              {event.status === 'upcoming' && (
                <TouchableOpacity
                  style={[
                    styles.participateButton,
                    (isParticipating(event.realId!) && event.type !== 'created') ? styles.participateButtonActive : styles.participateButtonInactive,
                    event.type === 'created' && styles.participateButtonDisabled
                  ]}
                  onPress={() => handleParticipationToggle(event.realId!)}
                  disabled={event.type === 'created'}
                >
                  {(isParticipating(event.realId!) && event.type !== 'created') ? (
                    <UserX size={16} color={Colors.white} />
                  ) : (
                    <UserCheck size={16} color={Colors.primary} />
                  )}
                  <Text style={[
                    styles.participateButtonText,
                    (isParticipating(event.realId!) && event.type !== 'created') ? styles.participateButtonTextActive : styles.participateButtonTextInactive
                  ]}>
                    {event.type === 'created' ? 'Mein Event' : (isParticipating(event.realId!) ? 'Abmelden' : 'Teilnehmen')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>

    </View>
    );
  };

  const renderFavoriteCard = (event: any) => {
    const eventImage = event.image || event.preview_image_url || event.image_url || 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg';

    return (
      <TouchableOpacity
        key={event.id}
        style={styles.favoriteCard}
        onPress={() => handleEventPress(event)}
        activeOpacity={0.8}
      >
        <Image source={{ uri: eventImage }} style={styles.favoriteImage} />
      <View style={styles.favoriteContent}>
        <Text style={styles.favoriteTitle} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.favoriteLocation} numberOfLines={1}>
          {event.location}
        </Text>
      </View>
    </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Filter Grid */}
      <Animated.View style={[styles.tabGridContainer, { height: tabsHeight, opacity: tabsOpacity, overflow: 'hidden' }]}>
        <View style={styles.tabGrid}>
          <TouchableOpacity
            style={[
              styles.tabGridButton,
              styles.tabUpcomingButton,
              activeTab === 'Kommend' && styles.tabGridButtonActive
            ]}
            onPress={() => setActiveTab('Kommend')}
          >
            <Text style={[
              styles.tabGridText,
              activeTab === 'Kommend' && styles.tabGridTextActive
            ]}>
              📅 Kommend ({allUpcomingEventsCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabGridButton,
              styles.tabCreatedButton,
              activeTab === 'Erstellt' && styles.tabGridButtonActive
            ]}
            onPress={() => setActiveTab('Erstellt')}
          >
            <Text style={[
              styles.tabGridText,
              activeTab === 'Erstellt' && styles.tabGridTextActive
            ]}>
              ✨ Erstellt ({allCreatedEventsCount})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabGrid}>
          <TouchableOpacity
            style={[
              styles.tabGridButton,
              styles.tabFavoritesButton,
              activeTab === 'Gefällt mir' && styles.tabGridButtonActive
            ]}
            onPress={() => setActiveTab('Gefällt mir')}
          >
            <Text style={[
              styles.tabGridText,
              activeTab === 'Gefällt mir' && styles.tabGridTextActive
            ]}>
              ❤️ Gefällt mir ({filteredLikedEvents.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabGridButton,
              styles.tabPastButton,
              activeTab === 'Vergangen' && styles.tabGridButtonActive
            ]}
            onPress={() => setActiveTab('Vergangen')}
          >
            <Text style={[
              styles.tabGridText,
              activeTab === 'Vergangen' && styles.tabGridTextActive
            ]}>
              📜 Vergangen ({allPastEventsCount})
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.gray500} />
          <TextInput
            style={styles.searchInput}
            placeholder="Meine Events durchsuchen..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.gray500}
          />
        </View>
      </View>

      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {showBanner && (
          <View style={styles.adContainer}>
            <AdBanner
              compact
              placement="events-top"
              onClose={() => setShowBanner(false)}
            />
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Lade Events...</Text>
          </View>
        ) : (
          <>
        {/* Erstellt Tab - Erstellte Events */}
        {activeTab === 'Erstellt' && upcomingCreatedEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Erstellte Events ({upcomingCreatedEvents.length})
            </Text>
            {upcomingCreatedEvents.map(renderEventCard)}
          </View>
        )}

        {/* Meine erstellten Events */}
        {activeTab !== 'Gefällt mir' && activeTab === 'Kommend' && createdEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Kommende Events (Erstellt)
            </Text>
            {createdEvents.map(renderEventCard)}
          </View>
        )}

        {/* Events an denen ich teilnehme */}
        {activeTab !== 'Gefällt mir' && activeTab === 'Kommend' && participatingEventsFiltered.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Kommende Events (Teilnahme)
            </Text>
            {participatingEventsFiltered.map(renderEventCard)}
          </View>
        )}


        {/* Vergangene Events - Erstellte */}
        {activeTab === 'Vergangen' && pastCreatedEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Vergangene Events (Erstellt) ({pastCreatedEvents.length})
            </Text>
            {pastCreatedEvents.map(renderEventCard)}
          </View>
        )}

        {/* Vergangene Events - Teilnahme */}
        {activeTab === 'Vergangen' && pastEvents.filter(e => e.type === 'participating').length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Vergangene Events (Teilnahme) ({pastEvents.filter(e => e.type === 'participating').length})
            </Text>
            {pastEvents.filter(e => e.type === 'participating').map(renderEventCard)}
          </View>
        )}

        {/* Gefällt mir */}
        {activeTab === 'Gefällt mir' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gefällt mir ({filteredLikedEvents.length})</Text>
            {filteredLikedEvents.length > 0 ? (
              filteredLikedEvents.map((event) => (
                <View key={event.id} style={styles.favoriteEventCard}>
                  <TouchableOpacity onPress={async () => {
                    try {
                      const { getEventById } = await import('../../services/eventService');
                      const fullEvent = await getEventById(event.id);
                      if (fullEvent) {
                        setSelectedEvent({ ...event, ...fullEvent } as any);
                        setShowEventDetail(true);
                      }
                    } catch (error) {
                      console.error('Error loading event details:', error);
                      setSelectedEvent(event as any);
                      setShowEventDetail(true);
                    }
                  }} activeOpacity={0.8}>
                    {/* Event Image */}
                    <View style={styles.eventImageContainer}>
                      <Image source={{ uri: event.preview_image_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg' }} style={styles.eventImage} />

                      {/* Like Button */}
                      <TouchableOpacity
                        style={styles.favoriteButton}
                        onPress={async () => {
                          const { toggleLike } = await import('../../services/likeService');
                          await toggleLike('event', event.id);

                          // Remove from liked list
                          const newLikedIds = new Set(likedEventIds);
                          newLikedIds.delete(event.id);
                          setLikedEventIds(newLikedIds);

                          // Reload liked events
                          loadLikedEvents();
                        }}
                      >
                        <Heart
                          size={20}
                          color={Colors.error}
                          fill={Colors.error}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Event Content */}
                    <View style={styles.eventContent}>
                      <Text style={styles.eventTitle} numberOfLines={2}>
                        {event.title}
                      </Text>

                      <View style={styles.eventDetails}>
                        <View style={styles.eventDetail}>
                          <Calendar size={14} color={Colors.gray500} />
                          <Text style={styles.eventDetailText}>
                            {formatEventDate(event.start_date, event.start_time || '00:00')}
                          </Text>
                        </View>

                        <View style={styles.eventDetail}>
                          <MapPin size={14} color={Colors.gray500} />
                          <Text style={styles.eventDetailText} numberOfLines={1}>
                            {event.city || 'Ort nicht angegeben'}
                          </Text>
                        </View>
                      </View>

                      {/* Category and Price */}
                      <View style={styles.favoriteFooter}>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryText}>{event.category}</Text>
                        </View>
                        <Text style={styles.priceText}>
                          {event.is_free ? 'Kostenlos' : event.price ? `€${event.price}` : 'Preis auf Anfrage'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Heart size={48} color={Colors.gray400} />
                <Text style={styles.emptyStateTitle}>Keine Likes gefunden</Text>
                <Text style={styles.emptyStateText}>
                  {searchQuery ? 'Versuche andere Suchbegriffe' : 'Du hast noch keine Events geliked'}
                </Text>
                {!searchQuery && (
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={() => router.push('/(tabs)/explore')}
                  >
                    <Text style={styles.emptyStateButtonText}>Events entdecken</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Empty State for Erstellt tab */}
        {activeTab === 'Erstellt' && createdEvents.length === 0 && (
          <View style={styles.section}>
            <View style={styles.emptyState}>
              <Calendar size={48} color={Colors.gray400} />
              <Text style={styles.emptyStateTitle}>Keine erstellten Events</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'Versuche andere Suchbegriffe' : 'Erstelle dein erstes Event'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={handleCreateEvent}
                >
                  <Text style={styles.emptyStateButtonText}>Event erstellen</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Empty State for filtered results */}
        {activeTab !== 'Gefällt mir' && activeTab !== 'Vergangen' && activeTab !== 'Erstellt' && filteredEvents.length === 0 && (
          <View style={styles.section}>
            <View style={styles.emptyState}>
              <Search size={48} color={Colors.gray400} />
              <Text style={styles.emptyStateTitle}>Keine Events gefunden</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'Versuche andere Suchbegriffe' : 'Erstelle dein erstes Event'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={handleCreateEvent}
                >
                  <Text style={styles.emptyStateButtonText}>Event erstellen</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}


        {/* Empty State for Vergangen tab */}
        {activeTab === 'Vergangen' && pastEvents.length === 0 && pastCreatedEvents.length === 0 && (
          <View style={styles.section}>
            <View style={styles.emptyState}>
              <Calendar size={48} color={Colors.gray400} />
              <Text style={styles.emptyStateTitle}>Keine vergangenen Events</Text>
              <Text style={styles.emptyStateText}>
                Du hast noch keine vergangenen Events
              </Text>
            </View>
          </View>
        )}
        </>
        )}
      </Animated.ScrollView>

      {/* Tap outside to close options menu */}
      {showOptionsMenu && (
        <>
          <TouchableOpacity
            style={styles.overlay}
            onPress={() => setShowOptionsMenu(null)}
            activeOpacity={1}
          />
          <View style={styles.optionsMenuOverlay}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                console.log('🔵 Pressed Edit button');
                handleEditEventFromMenu(showOptionsMenu);
              }}
              onPressIn={() => console.log('🔵 PressIn Edit')}
              onPressOut={() => console.log('🔵 PressOut Edit')}
              activeOpacity={0.7}
            >
              <Edit2 size={18} color={Colors.gray700} />
              <Text style={styles.optionText}>Bearbeiten</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                console.log('🔴 Pressed Delete button');
                handleDeleteEvent(showOptionsMenu);
              }}
              onPressIn={() => console.log('🔴 PressIn Delete')}
              onPressOut={() => console.log('🔴 PressOut Delete')}
              activeOpacity={0.7}
            >
              <Trash2 size={18} color={Colors.error} />
              <Text style={[styles.optionText, { color: Colors.error }]}>Löschen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                console.log('🟢 Pressed Share button');
                handleShareEvent(showOptionsMenu);
              }}
              onPressIn={() => console.log('🟢 PressIn Share')}
              onPressOut={() => console.log('🟢 PressOut Share')}
              activeOpacity={0.7}
            >
              <Share size={18} color={Colors.gray700} />
              <Text style={styles.optionText}>Teilen</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {selectedEvent && (
        <EventDetailModal
          visible={showEventDetail}
          event={selectedEvent}
          onClose={() => {
            setShowEventDetail(false);
            setSelectedEvent(null);
          }}
          onEdit={handleEditEvent}
          isOwnEvent={!!currentUserId && selectedEvent.user_id === currentUserId}
          onParticipationChange={() => {
            loadUserEvents();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Modal
        visible={showDeleteDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteDialog(false)}
      >
        <View style={styles.deleteDialogOverlay}>
          <View style={styles.deleteDialog}>
            <Text style={styles.deleteDialogTitle}>Event löschen</Text>
            <Text style={styles.deleteDialogMessage}>
              Möchtest du dieses Event wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </Text>

            <View style={styles.deleteDialogButtons}>
              <TouchableOpacity
                style={[styles.deleteDialogButton, styles.deleteDialogCancelButton]}
                onPress={() => {
                  setShowDeleteDialog(false);
                  setEventToDelete(null);
                }}
              >
                <Text style={styles.deleteDialogCancelText}>Abbrechen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteDialogButton, styles.deleteDialogConfirmButton]}
                onPress={confirmDeleteEvent}
              >
                <Text style={styles.deleteDialogConfirmText}>Löschen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray200,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: FontSizes.md,
    color: Colors.gray600,
  },
  adContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.gray800,
    borderBottomWidth: 0,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
  },
  createButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.full,
  },
  tabGridContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    gap: Spacing.md,
  },
  tabGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  tabGridButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabGridButtonActive: {
    transform: [{ scale: 0.95 }],
    shadowOpacity: 0.2,
    elevation: 4,
  },
  tabAllButton: {
    backgroundColor: Colors.gray600,
  },
  tabUpcomingButton: {
    backgroundColor: Colors.gray600,
  },
  tabCreatedButton: {
    backgroundColor: Colors.gray600,
  },
  tabFavoritesButton: {
    backgroundColor: Colors.gray600,
  },
  tabPastButton: {
    backgroundColor: Colors.gray600,
  },
  tabGridText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    color: Colors.white,
  },
  tabGridTextActive: {
    color: Colors.white,
    opacity: 0.8,
  },
  searchContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.gray800,
    borderBottomWidth: 0,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.gray800,
  },
  content: {
    flex: 1,
  },
  quickActions: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: Spacing.lg,
  },
  sectionLink: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  eventCard: {
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  eventImageContainer: {
    position: 'relative',
    height: 160,
  },
  eventImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  statusBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  upcomingBadge: {
    backgroundColor: Colors.secondary,
  },
  pastBadge: {
    backgroundColor: Colors.gray600,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },
  upcomingText: {
    color: Colors.white,
  },
  pastText: {
    color: Colors.white,
  },
  optionsButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: BorderRadius.full,
    padding: Spacing.sm,
  },
  optionsMenuOverlay: {
    position: 'absolute',
    top: 120,
    right: 20,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 999,
    zIndex: 10000,
    minWidth: 180,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    cursor: 'pointer',
    minHeight: 48,
  },
  optionItemPressed: {
    backgroundColor: Colors.gray50,
  },
  optionText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.gray700,
  },
  eventContent: {
    padding: Spacing.lg,
  },
  eventTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: Spacing.md,
    lineHeight: 24,
  },
  eventDetails: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  eventDetailText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    flex: 1,
  },
  participantsSection: {
    flexDirection: 'column',
    gap: Spacing.md,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participantAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  participantInitial: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  moreParticipants: {
    backgroundColor: Colors.gray400,
  },
  moreParticipantsText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  favoriteButton: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: BorderRadius.full,
    padding: Spacing.sm,
  },
  participantCount: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    fontWeight: FontWeights.medium,
  },
  participantInfo: {
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  participateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  participateButtonActive: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  participateButtonInactive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
  },
  participateButtonDisabled: {
    backgroundColor: Colors.gray200,
    borderColor: Colors.gray300,
    opacity: 0.5,
  },
  participateButtonText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
  participateButtonTextActive: {
    color: Colors.white,
  },
  participateButtonTextInactive: {
    color: Colors.primary,
  },
  favoritesContainer: {
    paddingRight: Spacing.xl,
    gap: Spacing.md,
  },
  favoriteCard: {
    width: 140,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  favoriteImage: {
    width: '100%',
    height: 80,
    resizeMode: 'cover',
  },
  favoriteContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  favoriteTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    lineHeight: 18,
  },
  favoriteLocation: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
  },
  deleteDialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  deleteDialog: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  deleteDialogTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  deleteDialogMessage: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  deleteDialogButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  deleteDialogButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  deleteDialogCancelButton: {
    backgroundColor: Colors.gray200,
  },
  deleteDialogCancelText: {
    color: Colors.gray700,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  deleteDialogConfirmButton: {
    backgroundColor: Colors.error,
  },
  deleteDialogConfirmText: {
    color: Colors.surface,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyStateTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  emptyStateButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  emptyStateButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
    textAlign: 'center',
  },
  favoriteEventCard: {
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  liveIndicator: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.live,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  liveText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  favoriteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  categoryBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  categoryText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  priceText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.secondary,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
});