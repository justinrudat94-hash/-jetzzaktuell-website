import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { router, useNavigation } from 'expo-router';
import {
  Heart,
  MessageCircle,
  Gift,
  Share2,
  Calendar,
  Flag,
  Eye,
  TrendingUp,
  Coins as CoinsIcon,
  MapPin,
  X,
  ArrowLeft,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../utils/authContext';
import LiveChatOverlay from '../../components/LiveChatOverlay';
import AdBanner from '../../components/AdBanner';
import { ReportButton } from '../../components/ReportButton';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface LiveEvent {
  id: string;
  title: string;
  description: string;
  image_url: string;
  location: string;
  creator_id: string;
  creator_name: string;
  creator_avatar?: string;
  is_live: boolean;
  stream_url?: string;
  viewer_count: number;
  like_count: number;
  stream_started_at?: string;
  coins_earned: number;
}

export default function LiveScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chatVisible, setChatVisible] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [showInterstitialAd, setShowInterstitialAd] = useState(false);
  const [showMilestoneBanner, setShowMilestoneBanner] = useState(false);
  const [showCoinModal, setShowCoinModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [coinAmount, setCoinAmount] = useState(10);
  const [eventsSinceAd, setEventsSinceAd] = useState(0);
  const [nextAdInterval, setNextAdInterval] = useState(Math.floor(Math.random() * 4) + 2);
  const [reachedMilestones, setReachedMilestones] = useState<number[]>([]);

  const translateY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        translateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50 && currentIndex > 0) {
          goToPrevious();
        } else if (gestureState.dy < -50 && currentIndex < liveEvents.length - 1) {
          goToNext();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: { display: 'none' },
    });

    return () => {
      navigation.setOptions({
        tabBarStyle: undefined,
      });
    };
  }, [navigation]);

  useEffect(() => {
    loadLiveEvents();
    const interval = setInterval(loadLiveEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!liveEvents[currentIndex]) return;

    const currentEvent = liveEvents[currentIndex];
    const milestones = [100, 500, 1000, 2000, 5000];

    for (const milestone of milestones) {
      if (currentEvent.viewer_count >= milestone && !reachedMilestones.includes(milestone)) {
        setReachedMilestones([...reachedMilestones, milestone]);
        setShowMilestoneBanner(true);
        setTimeout(() => setShowMilestoneBanner(false), 5000);
        break;
      }
    }
  }, [currentIndex, liveEvents]);

  const loadLiveEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        image_url,
        location,
        user_id,
        is_live,
        stream_url,
        viewer_count,
        like_count,
        stream_started_at
      `)
      .eq('is_live', true)
      .order('stream_started_at', { ascending: false });

    if (data && data.length > 0) {
      const formattedEvents: LiveEvent[] = await Promise.all(
        data.map(async (event: any) => {
          let creator_name = 'Unbekannt';
          let creator_avatar = undefined;

          if (event.user_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', event.user_id)
              .maybeSingle();

            if (profileData) {
              creator_name = profileData.username || 'Unbekannt';
              creator_avatar = profileData.avatar_url;
            }
          }

          return {
            id: event.id,
            title: event.title,
            description: event.description,
            image_url: event.image_url,
            location: event.location,
            creator_id: event.user_id,
            creator_name,
            creator_avatar,
            is_live: event.is_live,
            stream_url: event.stream_url,
            viewer_count: event.viewer_count || 0,
            like_count: event.like_count || 0,
            stream_started_at: event.stream_started_at,
            coins_earned: 0,
          };
        })
      );
      setLiveEvents(formattedEvents);
    } else {
      const mockEvents: LiveEvent[] = [
        {
          id: 'mock-1',
          title: 'Live Festival Berlin 🎉',
          description: 'Gerade live! Erlebe das Festival hautnah mit uns! 🎵',
          image_url: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg',
          location: 'Festival Arena Berlin',
          creator_id: 'demo',
          creator_name: 'DemoStreamer',
          creator_avatar: 'https://i.pravatar.cc/150?img=1',
          is_live: true,
          stream_url: 'https://example.com/stream/1',
          viewer_count: 342,
          like_count: 156,
          stream_started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          coins_earned: 89,
        },
        {
          id: 'mock-2',
          title: 'Live DJ Set am Strand 🎧',
          description: 'Chillige Sunset Vibes direkt vom Strand! 🌅',
          image_url: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg',
          location: 'Beach Club Hamburg',
          creator_id: 'demo',
          creator_name: 'BeachVibes',
          creator_avatar: 'https://i.pravatar.cc/150?img=2',
          is_live: true,
          stream_url: 'https://example.com/stream/2',
          viewer_count: 234,
          like_count: 198,
          stream_started_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
          coins_earned: 67,
        },
        {
          id: 'mock-3',
          title: 'Street Food Festival Live 🍔',
          description: 'Die besten Food Trucks der Stadt live!',
          image_url: 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg',
          location: 'Marktplatz München',
          creator_id: 'demo',
          creator_name: 'FoodieKing',
          creator_avatar: 'https://i.pravatar.cc/150?img=3',
          is_live: true,
          stream_url: 'https://example.com/stream/3',
          viewer_count: 567,
          like_count: 423,
          stream_started_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          coins_earned: 234,
        },
        {
          id: 'mock-4',
          title: 'Live Skateboard Contest 🛹',
          description: 'Die besten Tricks live! Sei dabei!',
          image_url: 'https://images.pexels.com/photos/2398375/pexels-photo-2398375.jpeg',
          location: 'Skatepark Stuttgart',
          creator_id: 'demo',
          creator_name: 'SkaterPro',
          creator_avatar: 'https://i.pravatar.cc/150?img=4',
          is_live: true,
          stream_url: 'https://example.com/stream/4',
          viewer_count: 456,
          like_count: 345,
          stream_started_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
          coins_earned: 178,
        },
        {
          id: 'mock-5',
          title: 'Late Night Jazz Session 🎷',
          description: 'Smooth jazz vibes mitten in der Nacht.',
          image_url: 'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg',
          location: 'Blue Note Club Berlin',
          creator_id: 'demo',
          creator_name: 'JazzMaster',
          creator_avatar: 'https://i.pravatar.cc/150?img=5',
          is_live: true,
          stream_url: 'https://example.com/stream/5',
          viewer_count: 189,
          like_count: 134,
          stream_started_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
          coins_earned: 67,
        },
      ];
      setLiveEvents(mockEvents);
    }
    setLoading(false);
  };

  const goToNext = () => {
    if (currentIndex < liveEvents.length - 1) {
      const newEventsSinceAd = eventsSinceAd + 1;
      setEventsSinceAd(newEventsSinceAd);

      if (newEventsSinceAd >= nextAdInterval) {
        setShowInterstitialAd(true);
        setEventsSinceAd(0);
        setNextAdInterval(Math.floor(Math.random() * 4) + 2);
      }

      Animated.timing(translateY, {
        toValue: -SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex(currentIndex + 1);
        translateY.setValue(0);
        setLiked(false);
      });
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex(currentIndex - 1);
        translateY.setValue(0);
        setLiked(false);
      });
    }
  };

  const handleLike = async () => {
    if (!currentEvent) return;
    setLiked(!liked);

    await supabase.from('event_likes').insert({
      event_id: currentEvent.id,
      user_id: user?.id,
    });

    await supabase.rpc('increment_like_count', {
      event_id: currentEvent.id,
    });
  };

  const handleSendCoins = () => {
    if (!currentEvent) return;
    setShowCoinModal(true);
  };

  const confirmSendCoins = async () => {
    if (!currentEvent) {
      setShowCoinModal(false);
      return;
    }

    const updatedEvents = [...liveEvents];
    const eventIndex = updatedEvents.findIndex(e => e.id === currentEvent.id);
    if (eventIndex !== -1) {
      updatedEvents[eventIndex].coins_earned = (updatedEvents[eventIndex].coins_earned || 0) + coinAmount;
      setLiveEvents(updatedEvents);
    }

    setShowCoinModal(false);
  };

  const handleShare = () => {
    if (!currentEvent) return;
    setShowShareModal(true);
  };

  const confirmShare = () => {
    setShowShareModal(false);
  };

  const toggleChat = () => {
    setChatVisible(!chatVisible);
  };

  const goToEvent = () => {
    if (currentEvent) {
      router.push(`/event/${currentEvent.id}`);
    }
  };

  const getStreamDuration = () => {
    if (!currentEvent?.stream_started_at) return '00:00';
    const start = new Date(currentEvent.stream_started_at).getTime();
    const now = Date.now();
    const diff = Math.floor((now - start) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Lade Live-Events...</Text>
      </View>
    );
  }

  if (liveEvents.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Keine Live-Events</Text>
        <Text style={styles.emptyText}>
          Aktuell gibt es keine Live-Events. Schau später wieder vorbei!
        </Text>
      </View>
    );
  }

  const currentEvent = liveEvents[currentIndex];

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <View style={styles.videoContainer}>
        <Animated.View
          style={[
            styles.videoWrapper,
            { transform: [{ translateY }] },
          ]}
        >
          <Image
            source={{ uri: currentEvent.image_url }}
            style={[styles.video, { resizeMode: 'cover' }]}
          />

          <View style={styles.topGradient} />
          <View style={styles.bottomGradient} />

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={28} color={Colors.white} />
          </TouchableOpacity>

          <View style={styles.streamerInfo}>
                <Image
                  source={{
                    uri:
                      currentEvent.creator_avatar ||
                      'https://via.placeholder.com/50',
                  }}
                  style={styles.avatar}
                />
                <View style={styles.streamerDetails}>
                  <View style={styles.liveRow}>
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>
                        LIVE · {getStreamDuration()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.streamerName}>
                    {currentEvent.creator_name}
                  </Text>
                  <Text style={styles.eventTitle}>{currentEvent.title}</Text>
                  <View style={styles.locationRow}>
                    <MapPin size={14} color={Colors.white} />
                    <Text style={styles.locationText}>
                      {currentEvent.location}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.statsOverlay}>
                <View style={styles.statItem}>
                  <Eye size={16} color={Colors.white} />
                  <Text style={styles.statText}>
                    {currentEvent.viewer_count}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Heart size={16} color={Colors.error} />
                  <Text style={styles.statText}>
                    {currentEvent.like_count}
                  </Text>
                </View>
                {currentEvent.creator_id === user?.id && (
                  <View style={styles.statItem}>
                    <CoinsIcon size={16} color={Colors.warning} />
                    <Text style={styles.statText}>
                      {currentEvent.coins_earned}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleLike}
                >
                  <Heart
                    size={32}
                    color={liked ? Colors.error : Colors.white}
                    fill={liked ? Colors.error : 'transparent'}
                  />
                  <Text style={styles.actionText}>
                    {currentEvent.like_count}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={toggleChat}
                >
                  <MessageCircle size={32} color={Colors.white} />
                  <Text style={styles.actionText}>Chat</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleSendCoins}
                >
                  <Gift size={32} color={Colors.white} />
                  <Text style={styles.actionText}>Coins</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleShare}
                >
                  <Share2 size={32} color={Colors.white} />
                  <Text style={styles.actionText}>Teilen</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={goToEvent}
                >
                  <Calendar size={32} color={Colors.white} />
                  <Text style={styles.actionText}>Event</Text>
                </TouchableOpacity>

                <View style={styles.actionButton}>
                  <ReportButton
                    entityType="livestream"
                    entityId={currentEvent.id}
                    entityOwnerId={currentEvent.creator_id}
                    entityTitle={currentEvent.title}
                    size={28}
                    color={Colors.white}
                  />
                  <Text style={styles.actionText}>Melden</Text>
                </View>
              </View>
        </Animated.View>
      </View>

      <LiveChatOverlay
        visible={chatVisible}
        onClose={toggleChat}
        eventId={currentEvent.id}
        streamerId={currentEvent.creator_id}
        currentUserId={user?.id || ''}
      />

      {showCoinModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Coins senden</Text>
            <Text style={styles.modalText}>
              Sende Coins an {currentEvent.creator_name}
            </Text>
            <View style={styles.coinOptions}>
              {[5, 10, 25, 50, 100].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.coinOption,
                    coinAmount === amount && styles.coinOptionSelected,
                  ]}
                  onPress={() => setCoinAmount(amount)}
                >
                  <Text
                    style={[
                      styles.coinOptionText,
                      coinAmount === amount && styles.coinOptionTextSelected,
                    ]}
                  >
                    {amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowCoinModal(false)}
              >
                <Text style={styles.modalButtonText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmSendCoins}
              >
                <Text style={styles.modalButtonText}>Senden</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {showShareModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Stream teilen</Text>
            <Text style={styles.modalText}>{currentEvent.title}</Text>
            <Text style={styles.modalSubtext}>
              Teile diesen Live-Stream mit deinen Freunden!
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmShare}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {showMilestoneBanner && (
        <View style={styles.milestoneBanner}>
          <AdBanner
            compact
            placement="live-milestone"
            onClose={() => setShowMilestoneBanner(false)}
            duration={5}
          />
        </View>
      )}

      {showInterstitialAd && (
        <View style={styles.interstitialOverlay}>
          <AdBanner
            placement="live-interstitial"
            onClose={() => setShowInterstitialAd(false)}
            duration={5}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.black,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.black,
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    color: Colors.gray400,
    textAlign: 'center',
  },
  videoContainer: {
    flex: 1,
  },
  videoWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: Spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 250,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  preRollAd: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  streamerInfo: {
    position: 'absolute',
    bottom: 30,
    left: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginRight: Spacing.md,
  },
  streamerDetails: {
    flex: 1,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.white,
    marginRight: 6,
  },
  liveText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  streamerName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.white,
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.white,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  statsOverlay: {
    position: 'absolute',
    top: 60,
    right: Spacing.lg,
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  actionButtons: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: 30,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  },
  swipeIndicator: {
    position: 'absolute',
    bottom: Spacing.xxl,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 4,
  },
  swipeText: {
    fontSize: FontSizes.sm,
    color: Colors.white,
    opacity: 0.7,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.xl,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  modalText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  modalSubtext: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  coinOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  coinOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  coinOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  coinOptionText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  coinOptionTextSelected: {
    color: Colors.white,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: Colors.lightGray,
  },
  modalButtonConfirm: {
    backgroundColor: Colors.primary,
  },
  modalButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  milestoneBanner: {
    position: 'absolute',
    top: 100,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 50,
  },
  interstitialOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    zIndex: 1000,
  },
});
