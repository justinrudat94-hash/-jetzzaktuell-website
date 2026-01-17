import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Search, ChevronDown, ChevronUp, MapPin, Loader, Maximize2, X, Navigation, Clock, Tag, Ticket } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, EVENT_CATEGORIES, SEASON_SPECIALS } from '../../constants';
import { useLocation } from '../../hooks/useLocation';
import { calculateDistance } from '../../utils/locationUtils';
import { getAllEvents, getEventById } from '../../services/eventService';
import { getUserId } from '../../utils/userStorage';
import { searchPlaces, PlaceSuggestion } from '../../utils/geocoding';
import EventCard from '../../components/EventCard';
import MapView, { MapViewSelectedEvent, MapEvent } from '../../components/MapView';
import AdBanner from '../../components/AdBanner';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import EventDetailModal from '../../components/EventDetailModal';
import { SearchHistoryItem, getUserSearchHistory, saveSearchToHistory, deleteSearchItem } from '../../services/searchHistoryService';
import { generateSearchSuggestions, generateEmptyStateSuggestions, getCityCoordinates } from '../../services/searchSuggestionService';
import { SearchSuggestion, groupSuggestions, highlightMatch, isWordBoundaryMatch, containsMatch } from '../../utils/searchScoring';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.3;

const DATE_FILTERS = ['Heute', 'Morgen', 'Diese Woche', 'Alle'];
const RADIUS_OPTIONS = [null, 5, 10, 25, 50, 100];
const PRICE_RANGES = [
  { label: 'Alle Preise', min: 0, max: Infinity },
  { label: 'Kostenlos', min: 0, max: 0 },
  { label: '1-10 €', min: 1, max: 10 },
  { label: '10-50 €', min: 10, max: 50 },
  { label: '50+ €', min: 50, max: Infinity },
];

interface FormattedEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  endDate?: string;
  endTime?: string;
  location: string;
  address: string;
  image: string;
  category: string;
  price: string | number;
  is_free?: boolean;
  ticket_url?: string;
  external_source?: string;
  attendees: number;
  organizer: string;
  tags: string[];
  coordinates: { latitude: number; longitude: number };
  distance?: number;
  priceValue?: number;
  user_id?: string;
}

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('Alle');
  const [selectedCategory, setSelectedCategory] = useState('Alle');
  const [selectedPriceRange, setSelectedPriceRange] = useState(0);
  const [selectedRadius, setSelectedRadius] = useState<number | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showPriceDropdown, setShowPriceDropdown] = useState(false);
  const [events, setEvents] = useState<FormattedEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showBanner, setShowBanner] = useState(Math.random() > 0.6);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [selectedMapEvent, setSelectedMapEvent] = useState<MapEvent | null>(null);
  const [showFullscreenMap, setShowFullscreenMap] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<FormattedEvent | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedCityName, setSelectedCityName] = useState<string | null>(null);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const { location, loading: locationLoading } = useLocation();
  const scrollViewRef = useRef<ScrollView>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const categories = ['Alle', ...EVENT_CATEGORIES];

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDateFilter('Alle');
    setSelectedCategory('Alle');
    setSelectedPriceRange(0);
    setSelectedRadius(null);
    setShowCategoryDropdown(false);
    setShowPriceDropdown(false);
    setSuggestions([]);
    setPlaceSuggestions([]);
    setShowSuggestions(false);
    setFiltersExpanded(true);
    setSelectedMapEvent(null);
    setShowFullscreenMap(false);
    setSelectedEvent(null);
    setShowEventDetail(false);
    setSelectedLocation(null);
    setSelectedCityName(null);
  };

  useFocusEffect(
    React.useCallback(() => {
      resetFilters();
      loadEvents();
      loadSearchHistory();
    }, [])
  );

  useEffect(() => {
    loadEvents();
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const userId = await getUserId();
      if (userId) {
        const history = await getUserSearchHistory(userId, 20);
        setSearchHistory(history);
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  useEffect(() => {
    console.log('🔄 Search query changed:', searchQuery);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length > 0) {
      console.log('⏳ Starting search debounce...');
      searchTimeoutRef.current = setTimeout(() => {
        console.log('🚀 Generating suggestions...');
        generateSmartSuggestions();
        searchPlacesDebounced();
      }, 300);
    } else {
      console.log('🧹 Clearing suggestions (empty query)');
      setSuggestions([]);
      setPlaceSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Removed useFocusEffect - it was causing the page to reset on every interaction

  const loadEvents = async () => {
    try {
      setLoadingEvents(true);
      const userId = await getUserId();
      setCurrentUserId(userId);

      const dbEvents = await getAllEvents(100);

      const formattedEvents: FormattedEvent[] = dbEvents.map((event) => {
        const priceValue = event.is_free ? 0 : parseFloat(event.price?.toString() || '0');

        const coordinates =
          event.latitude && event.longitude
            ? { latitude: event.latitude, longitude: event.longitude }
            : { latitude: 48.1351, longitude: 11.5820 };

        return {
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.start_date,
          time: event.start_time,
          endDate: event.end_date,
          endTime: event.end_time,
          location: event.city || event.location,
          city: event.city,
          address: [event.street, event.city].filter(Boolean).join(', ') || event.location,
          image:
            event.preview_image_url ||
            'https://images.pexels.com/photos/976866/pexels-photo-976866.jpeg',
          category: event.category,
          price: event.price || 0,
          is_free: event.is_free,
          ticket_url: event.ticket_url,
          external_source: event.external_source,
          attendees: event.attendees || 0,
          organizer: 'Veranstalter',
          tags: [event.category],
          coordinates,
          priceValue,
        };
      });

      setEvents(formattedEvents);
      console.log('✅ Loaded events:', formattedEvents.length, 'events');
      console.log('First event:', formattedEvents[0]);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const searchPlacesDebounced = async () => {
    if (searchQuery.trim().length < 2) {
      setPlaceSuggestions([]);
      return;
    }

    setSearchingPlaces(true);
    try {
      const places = await searchPlaces(searchQuery);
      setPlaceSuggestions(places);
    } catch (error) {
      console.error('Error searching places:', error);
      setPlaceSuggestions([]);
    } finally {
      setSearchingPlaces(false);
    }
  };

  const generateSmartSuggestions = () => {
    const query = searchQuery.trim();
    if (!query) {
      setSuggestions([]);
      return;
    }

    try {
      const limitedEvents = events.slice(0, 100).map(e => ({
        id: e.id,
        title: e.title,
        location: e.location,
        attendees: e.attendees,
      }));

      const googlePlaces = placeSuggestions.map(p => ({
        description: p.displayName,
      }));

      const smartSuggestions = generateSearchSuggestions(
        query,
        limitedEvents,
        searchHistory,
        googlePlaces
      );

      setSuggestions(smartSuggestions);
      const shouldShow = smartSuggestions.length > 0 || placeSuggestions.length > 0;
      setShowSuggestions(shouldShow);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handlePlaceSelect = async (place: PlaceSuggestion) => {
    console.log('🏙️ Place selected from Google:', place.displayName);
    const cityName = place.displayName.split(',')[0];
    console.log('📍 Setting location:', { lat: place.latitude, lng: place.longitude, city: cityName });

    setSearchQuery('');
    setSelectedLocation({
      latitude: place.latitude,
      longitude: place.longitude,
    });
    setSelectedCityName(cityName);
    setShowSuggestions(false);
    setPlaceSuggestions([]);
    setSuggestions([]);
    console.log('✅ Place selection complete');

    if (selectedRadius === null) {
      setSelectedRadius(30);
    }

    const userId = await getUserId();
    if (userId) {
      await saveSearchToHistory(userId, cityName, 'place');
      await loadSearchHistory();
    }

    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: MAP_HEIGHT + 50, animated: true });
    }
  };

  const handleSuggestionSelect = async (suggestion: SearchSuggestion) => {
    console.log('🏙️ Suggestion selected:', suggestion);
    setShowSuggestions(false);

    const userId = await getUserId();
    if (userId) {
      const searchType = suggestion.type === 'history' ? 'event' : suggestion.type;
      await saveSearchToHistory(userId, suggestion.text, searchType);
      await loadSearchHistory();
    }

    const coordinates = getCityCoordinates(suggestion.text);
    console.log('📍 Coordinates for', suggestion.text, ':', coordinates);
    console.log('🔍 Suggestion type:', suggestion.type);

    if (coordinates && suggestion.type === 'place') {
      console.log('✅ Setting city location:', suggestion.text, coordinates);
      setSearchQuery('');
      setSelectedLocation(coordinates);
      setSelectedCityName(suggestion.text);
      if (selectedRadius === null) {
        console.log('📏 Setting default radius to 30km');
        setSelectedRadius(30);
      }
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: MAP_HEIGHT + 50, animated: true });
      }
    } else {
      console.log('🔍 Setting search query:', suggestion.text);
      setSearchQuery(suggestion.text);
    }
  };

  const handleSearchFocus = () => {
    if (searchQuery.length === 0) {
      const { topSearches, recentSearches } = generateEmptyStateSuggestions(searchHistory);
      const emptyStateSuggestions: SearchSuggestion[] = [
        ...topSearches.map(item => ({
          text: item.search_term,
          type: 'history' as const,
          score: 200 + item.search_count,
          searchCount: item.search_count,
        })),
        ...recentSearches.map(item => ({
          text: item.search_term,
          type: 'history' as const,
          score: 150,
        })),
      ];
      setSuggestions(emptyStateSuggestions);
      setShowSuggestions(emptyStateSuggestions.length > 0);
    } else {
      setShowSuggestions(suggestions.length > 0);
    }
  };

  const handleDeleteHistoryItem = async (searchId: string) => {
    const userId = await getUserId();
    if (userId) {
      const success = await deleteSearchItem(userId, searchId);
      if (success) {
        await loadSearchHistory();
      }
    }
  };

  const handleResetToCurrentLocation = () => {
    setSelectedLocation(null);
    setSelectedCityName(null);
    setSearchQuery('');
  };

  const filterByDate = (event: FormattedEvent) => {
    if (selectedDateFilter === 'Alle') return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (selectedDateFilter === 'Heute') return diffDays === 0;
    if (selectedDateFilter === 'Morgen') return diffDays === 1;
    if (selectedDateFilter === 'Diese Woche') return diffDays >= 0 && diffDays <= 7;

    return true;
  };

  const filterByPrice = (event: FormattedEvent) => {
    const range = PRICE_RANGES[selectedPriceRange];
    const price = event.priceValue || 0;
    return price >= range.min && price <= range.max;
  };

  const activeLocation = selectedLocation || location;

  const filteredEvents = events
    .map((event) => {
      if (activeLocation && event.coordinates) {
        const distance = calculateDistance(activeLocation, event.coordinates);
        return { ...event, distance };
      }
      return { ...event, distance: 0 };
    })
    .filter((event) => {
      const query = searchQuery.trim();
      if (!query) {
        const matchesCategory = selectedCategory === 'Alle' || event.category === selectedCategory;
        const matchesDate = filterByDate(event);
        const matchesPrice = filterByPrice(event);
        const matchesRadius = selectedRadius === null || !activeLocation || (event.distance || 0) <= selectedRadius;
        return matchesCategory && matchesDate && matchesPrice && matchesRadius;
      }

      const matchesSearch =
        isWordBoundaryMatch(event.title, query) ||
        containsMatch(event.title, query) ||
        isWordBoundaryMatch(event.category, query) ||
        (event.location && isWordBoundaryMatch(event.location, query));

      const matchesCategory = selectedCategory === 'Alle' || event.category === selectedCategory;
      const matchesDate = filterByDate(event);
      const matchesPrice = filterByPrice(event);
      const matchesRadius = selectedRadius === null || !activeLocation || (event.distance || 0) <= selectedRadius;

      const passes = matchesSearch && matchesCategory && matchesDate && matchesPrice && matchesRadius;
      return passes;
    })
    .sort((a, b) => {
      if (location) {
        const distanceDiff = (a.distance || 0) - (b.distance || 0);
        if (distanceDiff !== 0) return distanceDiff;
      }
      return b.attendees - a.attendees;
    });

  return (
    <View style={styles.container}>
      <View style={styles.filterHeader}>
        <SafeAreaView>
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Search size={20} color={Colors.gray500} />
              <TextInput
                style={styles.searchInput}
                placeholder="Suche nach Events oder Orten..."
                value={searchQuery}
                onChangeText={(text) => {
                  console.log('🔍 Search input changed:', text);
                  setSearchQuery(text);
                }}
                placeholderTextColor={Colors.gray500}
                cursorColor={Colors.primary}
                selectionColor={Colors.primary}
                onFocus={handleSearchFocus}
              />
              {searchingPlaces && <Loader size={16} color={Colors.primary} />}
              {selectedLocation && (
                <TouchableOpacity
                  onPress={handleResetToCurrentLocation}
                  style={styles.resetLocationButton}
                >
                  <Navigation size={16} color={Colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setFiltersExpanded(!filtersExpanded)}
                style={styles.expandButton}
              >
                {filtersExpanded ? (
                  <ChevronUp size={20} color={Colors.gray600} />
                ) : (
                  <ChevronDown size={20} color={Colors.gray600} />
                )}
              </TouchableOpacity>
            </View>
          </View>

        {filtersExpanded && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dateFilterContainer}
              contentContainerStyle={styles.dateFilterContent}
            >
          {DATE_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                selectedDateFilter === filter && styles.filterChipActive,
              ]}
              onPress={() => setSelectedDateFilter(filter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedDateFilter === filter && styles.filterChipTextActive,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.dropdownRow}>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => {
              setShowCategoryDropdown(!showCategoryDropdown);
              setShowPriceDropdown(false);
            }}
          >
            <Text style={styles.dropdownText}>{selectedCategory}</Text>
            <ChevronDown size={18} color={Colors.gray600} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => {
              setShowPriceDropdown(!showPriceDropdown);
              setShowCategoryDropdown(false);
            }}
          >
            <Text style={styles.dropdownText}>{PRICE_RANGES[selectedPriceRange].label}</Text>
            <ChevronDown size={18} color={Colors.gray600} />
          </TouchableOpacity>
        </View>

        {showCategoryDropdown && (
          <View style={styles.dropdownMenu}>
            <ScrollView style={styles.dropdownScroll}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedCategory(category);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedCategory === category && styles.dropdownItemTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {showPriceDropdown && (
          <View style={styles.dropdownMenu}>
            <ScrollView style={styles.dropdownScroll}>
              {PRICE_RANGES.map((range, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedPriceRange(index);
                    setShowPriceDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedPriceRange === index && styles.dropdownItemTextActive,
                    ]}
                  >
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.radiusSection}>
          <View style={styles.radiusHeader}>
            <MapPin size={16} color={Colors.primary} />
            <Text style={styles.radiusLabel}>
              {selectedRadius === null ? 'Ohne Umkreis' : `Umkreis: ${selectedRadius} km`}
            </Text>
            {selectedLocation && (
              <View style={styles.customLocationBadge}>
                <Text style={styles.customLocationText}>
                  {selectedCityName || 'Benutzerdefiniert'}
                </Text>
              </View>
            )}
            {locationLoading && <Loader size={14} color={Colors.primary} />}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.radiusButtons}
          >
            {RADIUS_OPTIONS.map((radius, index) => (
              <TouchableOpacity
                key={radius === null ? 'unlimited' : radius}
                style={[
                  styles.radiusButton,
                  selectedRadius === radius && styles.radiusButtonActive,
                ]}
                onPress={() => setSelectedRadius(radius)}
              >
                <Text
                  style={[
                    styles.radiusButtonText,
                    selectedRadius === radius && styles.radiusButtonTextActive,
                  ]}
                >
                  {radius === null ? 'Alle' : `${radius} km`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedRadius !== null && (
            <View style={styles.sliderSection}>
              <Text style={styles.sliderLabel}>Umkreis auswählen</Text>
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={selectedRadius}
                  onValueChange={setSelectedRadius}
                  minimumTrackTintColor={Colors.primary}
                  maximumTrackTintColor={Colors.gray300}
                  thumbTintColor={Colors.primary}
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabelText}>0 km</Text>
                  <Text style={styles.sliderLabelText}>100 km</Text>
                </View>
              </View>
            </View>
          )}
        </View>
        </>
      )}
        </SafeAreaView>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          const scrollY = event.nativeEvent.contentOffset.y;
          if (scrollY > MAP_HEIGHT * 0.5 && filtersExpanded) {
            setFiltersExpanded(false);
          }
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.mapSection}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>Events in deiner Nähe</Text>
            <Text style={styles.mapSubtitle}>Tippe auf Marker für Details • Nutze "Ganze Karte" zum Zoomen & Navigieren</Text>
          </View>
          <View style={styles.mapContainer}>
            <MapView
              events={filteredEvents}
              userLocation={activeLocation}
              selectedEventId={selectedMapEvent?.id}
              onEventSelect={(event) => {
                setSelectedMapEvent(event);
                setFiltersExpanded(false);
              }}
            />
            <TouchableOpacity
              style={styles.fullscreenMapButton}
              onPress={() => setShowFullscreenMap(true)}
            >
              <Maximize2 size={20} color={Colors.white} />
              <Text style={styles.fullscreenMapButtonText}>Ganze Karte</Text>
            </TouchableOpacity>
          </View>
        </View>

        {selectedMapEvent && (
          <MapViewSelectedEvent
            event={selectedMapEvent}
            onClose={() => setSelectedMapEvent(null)}
            onDetailsPress={() => {
              router.push(`/event/${selectedMapEvent.id}`);
            }}
          />
        )}

        {showBanner && (
          <View style={styles.adContainer}>
            <AdBanner
              compact
              placement="explore-map"
              onClose={() => setShowBanner(false)}
            />
          </View>
        )}

        <View style={styles.eventListSection}>
          <View style={styles.eventListHeader}>
            <Text style={styles.eventListTitle}>Events in deiner Nähe</Text>
            <Text style={styles.eventCount}>
              {loadingEvents ? 'Lädt...' : `${filteredEvents.length} ${filteredEvents.length === 1 ? 'Event' : 'Events'}`}
            </Text>
          </View>

          {loadingEvents ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Events werden geladen...</Text>
            </View>
          ) : filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                showDistance={!!activeLocation}
                distance={event.distance}
                onPress={async (e) => {
                  try {
                    const fullEvent = await getEventById(String(e.id));
                    if (fullEvent) {
                      const combinedEvent = {
                        ...fullEvent,
                        date: fullEvent.start_date,
                        time: fullEvent.start_time,
                        endDate: fullEvent.end_date,
                        endTime: fullEvent.end_time,
                        location: fullEvent.location || fullEvent.city,
                        address: [fullEvent.street, fullEvent.city].filter(Boolean).join(', ') || fullEvent.location,
                        image: fullEvent.preview_image_url || fullEvent.image_url || fullEvent.image,
                        organizer: 'Veranstalter',
                        tags: [fullEvent.category],
                        coordinates: fullEvent.latitude && fullEvent.longitude
                          ? { latitude: fullEvent.latitude, longitude: fullEvent.longitude }
                          : e.coordinates,
                      };
                      setSelectedEvent(combinedEvent as any);
                      setShowEventDetail(true);
                    }
                  } catch (error) {
                    console.error('Error loading event details:', error);
                    setSelectedEvent(event);
                    setShowEventDetail(true);
                  }
                }}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>Keine Events gefunden</Text>
              <Text style={styles.emptyStateText}>
                Versuche andere Filter oder erweitere den Suchradius
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <ScrollToTopButton scrollViewRef={scrollViewRef} />

      <Modal
        visible={showFullscreenMap}
        animationType="slide"
        onRequestClose={() => setShowFullscreenMap(false)}
      >
        <SafeAreaView style={styles.fullscreenMapContainer}>
          <View style={styles.fullscreenMapHeader}>
            <Text style={styles.fullscreenMapTitle}>Karte</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowFullscreenMap(false)}
            >
              <X size={24} color={Colors.gray900} />
            </TouchableOpacity>
          </View>
          <MapView
            events={filteredEvents}
            userLocation={activeLocation}
            selectedEventId={selectedMapEvent?.id}
            onEventSelect={(event) => {
              setSelectedMapEvent(event);
            }}
            fullscreen
          />
          {selectedMapEvent && (
            <MapViewSelectedEvent
              event={selectedMapEvent}
              onClose={() => setSelectedMapEvent(null)}
              onDetailsPress={() => {
                setShowFullscreenMap(false);
                router.push(`/event/${selectedMapEvent.id}`);
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

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

      {showSuggestions && (placeSuggestions.length > 0 || suggestions.length > 0) && (() => {
        const grouped = groupSuggestions(suggestions);
        return (
          <View style={styles.suggestionsOverlay}>
            <ScrollView
              style={styles.suggestionsList}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
            {grouped.history.length > 0 && (
              <View>
                <View style={styles.suggestionHeader}>
                  <Clock size={14} color={Colors.gray500} />
                  <Text style={styles.suggestionHeaderText}>Oft gesucht</Text>
                </View>
                {grouped.history.map((suggestion, index) => (
                  <TouchableOpacity
                    key={`history-${index}`}
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionSelect(suggestion)}
                  >
                    <Clock size={16} color={Colors.primary} />
                    <Text style={styles.suggestionText} numberOfLines={1}>
                      {suggestion.text}
                    </Text>
                    {suggestion.searchCount && suggestion.searchCount > 1 && (
                      <Text style={styles.searchCountBadge}>{suggestion.searchCount}x</Text>
                    )}
                  </TouchableOpacity>
                ))}
                {(grouped.categories.length > 0 || grouped.events.length > 0 || grouped.places.length > 0) && (
                  <View style={styles.suggestionDivider} />
                )}
              </View>
            )}

            {grouped.categories.length > 0 && (
              <View>
                <View style={styles.suggestionHeader}>
                  <Tag size={14} color={Colors.gray500} />
                  <Text style={styles.suggestionHeaderText}>Kategorien</Text>
                </View>
                {grouped.categories.map((suggestion, index) => (
                  <TouchableOpacity
                    key={`category-${index}`}
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionSelect(suggestion)}
                  >
                    <Tag size={16} color={Colors.primary} />
                    <Text style={styles.suggestionText} numberOfLines={1}>
                      {suggestion.text}
                    </Text>
                  </TouchableOpacity>
                ))}
                {(grouped.events.length > 0 || grouped.places.length > 0) && (
                  <View style={styles.suggestionDivider} />
                )}
              </View>
            )}

            {grouped.events.length > 0 && (
              <View>
                <View style={styles.suggestionHeader}>
                  <Ticket size={14} color={Colors.gray500} />
                  <Text style={styles.suggestionHeaderText}>Events</Text>
                </View>
                {grouped.events.map((suggestion, index) => (
                  <TouchableOpacity
                    key={`event-${index}`}
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionSelect(suggestion)}
                  >
                    <Ticket size={16} color={Colors.primary} />
                    <Text style={styles.suggestionText} numberOfLines={1}>
                      {suggestion.text}
                    </Text>
                  </TouchableOpacity>
                ))}
                {grouped.places.length > 0 && <View style={styles.suggestionDivider} />}
              </View>
            )}

            {(grouped.places.length > 0 || placeSuggestions.length > 0) && (
              <View>
                <View style={styles.suggestionHeader}>
                  <MapPin size={14} color={Colors.gray500} />
                  <Text style={styles.suggestionHeaderText}>Orte</Text>
                </View>
                {grouped.places.map((suggestion, index) => (
                  <TouchableOpacity
                    key={`place-${index}`}
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionSelect(suggestion)}
                  >
                    <MapPin size={16} color={Colors.primary} />
                    <Text style={styles.suggestionText} numberOfLines={1}>
                      {suggestion.text}
                    </Text>
                  </TouchableOpacity>
                ))}
                {placeSuggestions.map((place, index) => (
                  <TouchableOpacity
                    key={`gplace-${index}`}
                    style={styles.suggestionItem}
                    onPress={() => handlePlaceSelect(place)}
                  >
                    <MapPin size={16} color={Colors.primary} />
                    <Text style={styles.suggestionText} numberOfLines={1}>
                      {place.displayName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            </ScrollView>
          </View>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray200,
  },
  adContainer: {
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
  },
  filterHeader: {
    backgroundColor: Colors.gray800,
    borderBottomWidth: 0,
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  searchSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    zIndex: 9999,
    position: 'relative',
    backgroundColor: Colors.white,
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
  expandButton: {
    padding: Spacing.xs,
  },
  resetLocationButton: {
    padding: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.gray800,
    outlineStyle: 'none',
  },
  suggestionsOverlay: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 100 : 120,
    left: Spacing.xl,
    right: Spacing.xl,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    maxHeight: 400,
    zIndex: 10000,
    ...Platform.select({
      ios: {
        shadowColor: Colors.gray800,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  suggestionsList: {
    maxHeight: 400,
    backgroundColor: '#FFFFFF',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    backgroundColor: '#FFFFFF',
  },
  suggestionText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.gray800,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.gray50,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  suggestionHeaderText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.gray500,
    textTransform: 'uppercase',
  },
  suggestionDivider: {
    height: 1,
    backgroundColor: Colors.gray200,
    marginVertical: Spacing.xs,
  },
  searchCountBadge: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    color: Colors.gray500,
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  dateFilterContainer: {
    paddingHorizontal: Spacing.xl,
  },
  dateFilterContent: {
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  filterChip: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.gray700,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  dropdownRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  dropdown: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  dropdownText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.gray700,
  },
  dropdownMenu: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    maxHeight: 200,
    ...Platform.select({
      ios: {
        shadowColor: Colors.gray800,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  dropdownItemText: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },
  radiusSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  radiusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  radiusLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.gray700,
    flex: 1,
  },
  customLocationBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  customLocationText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  radiusButtons: {
    gap: Spacing.sm,
  },
  radiusButton: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  radiusButtonActive: {
    backgroundColor: Colors.primary,
  },
  radiusButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.gray700,
  },
  radiusButtonTextActive: {
    color: Colors.white,
  },
  sliderSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sliderLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
    marginBottom: Spacing.sm,
  },
  sliderContainer: {
    paddingHorizontal: Spacing.xs,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -Spacing.sm,
  },
  sliderLabelText: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
  },
  scrollContent: {
    flex: 1,
  },
  mapSection: {
    marginBottom: Spacing.xl,
    zIndex: 1,
    position: 'relative',
  },
  mapHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  mapTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  mapSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    lineHeight: 16,
  },
  mapContainer: {
    position: 'relative',
    zIndex: 1,
  },
  fullscreenMapButton: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fullscreenMapButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  fullscreenMapContainer: {
    flex: 1,
    backgroundColor: Colors.gray200,
  },
  fullscreenMapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  fullscreenMapTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  eventListSection: {
    padding: Spacing.xl,
  },
  eventListHeader: {
    marginBottom: Spacing.lg,
  },
  eventListTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: Spacing.xs,
  },
  eventCount: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.massive,
    gap: Spacing.lg,
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    fontWeight: FontWeights.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.massive,
  },
  emptyStateTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 22,
  },
});
