import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, RefreshControl, Alert } from 'react-native';
import { Colors, Spacing,  FontSizes,  FontWeights,  BorderRadius } from '../constants';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { User, MapPin, Calendar, Users, Heart, Star, Camera, Video, Settings, Share, HelpCircle, ChevronRight, UserCheck2, UserPlus2, ThumbsUp, LogOut, Coins, Award, TrendingUp, Ticket, Shield, Edit, DollarSign, Phone, CheckCircle, Bell, Crown } from 'lucide-react-native';
import NotificationBell from './NotificationBell';
import { useFavorites } from '../hooks/useFavorites';
import { useRewards } from '../hooks/useRewards';
import { getCurrentUserEvents } from '../services/eventService';
import { getFollowerCount, getFollowingCount } from '../services/followService';
import { formatCoins, getLevelColor } from '../services/rewardService';
import { useAuth } from '../utils/authContext';
import PremiumUpgradeModal from './PremiumUpgradeModal';
import { AdFreeHoursWidget } from './AdFreeHoursWidget';
import { premiumService, SubscriptionStatus } from '../services/premiumService';

export default function ProfilePage() {
  const { user, profile, isGuest, signOut, refreshProfile } = useAuth();
  const { count: favoritesCount } = useFavorites();
  const { stats, level, coins, likesReceived, rank, levelProgress } = useRewards();
  const [userEvents, setUserEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const params = useLocalSearchParams();

  useFocusEffect(
    React.useCallback(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
      loadUserEvents();
      loadFollowCounts();
      loadSubscriptionStatus();
      if (refreshProfile) {
        refreshProfile();
      }
    }, [])
  );

  useEffect(() => {
    handlePremiumCallback();
  }, [params]);

  const handlePremiumCallback = async () => {
    if (params.premium === 'success') {
      Alert.alert(
        'Premium aktiviert!',
        'Dein Premium-Abonnement wurde erfolgreich aktiviert. Genieße werbefreie Inhalte und exklusive Features!',
        [
          {
            text: 'OK',
            onPress: async () => {
              router.replace('/(tabs)/profile');
              if (refreshProfile) {
                await refreshProfile();
              }
              await loadSubscriptionStatus();
            }
          }
        ]
      );
    } else if (params.premium === 'cancelled') {
      Alert.alert(
        'Abonnement abgebrochen',
        'Die Premium-Aktivierung wurde abgebrochen.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/profile')
          }
        ]
      );
    }
  };

  const loadUserEvents = async () => {
    try {
      console.log('ProfilePage: Loading user events...');
      setLoading(true);
      const events = await getCurrentUserEvents();
      console.log('ProfilePage: Loaded events:', events.length);
      setUserEvents(events);
    } catch (error) {
      console.error('Error loading user events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowCounts = async () => {
    if (!user) return;

    try {
      const [followers, following] = await Promise.all([
        getFollowerCount(user.id),
        getFollowingCount(user.id),
      ]);

      setFollowerCount(followers);
      setFollowingCount(following);
    } catch (error) {
      console.error('Error loading follow counts:', error);
    }
  };

  const loadSubscriptionStatus = async () => {
    if (!user) return;

    try {
      const status = await premiumService.getSubscriptionStatus(user.id);
      setSubscriptionStatus(status);
      console.log('ProfilePage: Subscription status loaded:', status);
    } catch (error) {
      console.error('Error loading subscription status:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (refreshProfile) {
      await refreshProfile();
    }
    await loadUserEvents();
    await loadFollowCounts();
    await loadSubscriptionStatus();
    setRefreshing(false);
  };

  const formatEventDate = (date: string, time: string) => {
    const eventDate = new Date(date);
    return `${eventDate.toLocaleDateString('de-DE')}, ${time}`;
  };

  const isUpcoming = (date: string) => {
    return new Date(date) >= new Date();
  };

  const socialStats = [
    { label: 'Follower', value: followerCount.toString(), icon: UserCheck2, route: '/followers' },
    { label: 'Folge ich', value: followingCount.toString(), icon: UserPlus2, route: '/following' },
    { label: 'Likes', value: likesReceived.toString(), icon: ThumbsUp },
  ];

  const quickAccessItems = [
    { label: 'Meine Events verwalten', icon: Calendar, onPress: () => router.push('/(tabs)/events?tab=Alle') },
    { label: 'Meine Tickets', icon: Ticket, onPress: () => router.push('/tickets' as any) },
    { label: 'Favoriten öffnen', icon: Heart, onPress: () => router.push('/favorites') },
    { label: 'Bewertungen ansehen', icon: Star, onPress: () => console.log('View Reviews') },
  ];

  const handleLogout = async () => {
    await signOut();
    router.replace('/auth/welcome');
  };

  console.log('ProfilePage: Admin status:', profile?.is_admin);
  console.log('ProfilePage: Profile:', profile);

  const optionItems = [
    ...(profile?.is_admin ? [{
      label: '⚡ Admin-Dashboard',
      icon: Shield,
      onPress: () => {
        console.log('Admin button clicked');
        router.push('/admin' as any);
      },
      isAdmin: true
    }] : []),
    { label: 'Benachrichtigungen', icon: Bell, onPress: () => router.push('/notifications' as any) },
    { label: 'Einstellungen', icon: Settings, onPress: () => router.push('/profile/settings' as any) },
    { label: 'Auszahlungen', icon: DollarSign, onPress: () => router.push('/profile/payouts' as any) },
    { label: 'App teilen', icon: Share, onPress: () => console.log('Share App') },
    { label: 'Hilfe & Support', icon: HelpCircle, onPress: () => router.push('/profile/support' as any) },
    ...(!isGuest ? [{ label: 'Abmelden', icon: LogOut, onPress: handleLogout }] : []),
  ];

  const mockPhotos = [
    'https://images.pexels.com/photos/976866/pexels-photo-976866.jpeg',
    'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg',
    'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg',
    'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg',
  ];

  if (isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.guestContainer}>
          <View style={styles.guestIcon}>
            <User size={64} color={Colors.primary} />
          </View>
          <Text style={styles.guestTitle}>Du bist im Gast-Modus</Text>
          <Text style={styles.guestDescription}>
            Registriere dich jetzt, um alle Funktionen zu nutzen
          </Text>

          <View style={styles.guestBenefits}>
            <Text style={styles.guestBenefitsTitle}>Mit einem Account kannst du:</Text>
            <Text style={styles.guestBenefitItem}>✓ Events erstellen</Text>
            <Text style={styles.guestBenefitItem}>✓ An Events teilnehmen</Text>
            <Text style={styles.guestBenefitItem}>✓ Events liken & favorisieren</Text>
            <Text style={styles.guestBenefitItem}>✓ Mit anderen Nutzern connecten</Text>
            <Text style={styles.guestBenefitItem}>✓ Dein Profil personalisieren</Text>
          </View>

          <TouchableOpacity
            style={styles.guestRegisterButton}
            onPress={() => router.push('/auth/register')}
          >
            <Text style={styles.guestRegisterButtonText}>
              Jetzt kostenlos registrieren
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guestLoginButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.guestLoginButtonText}>
              Ich habe bereits einen Account
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <View style={styles.headerBarLeft} />
        <Text style={styles.headerBarTitle}>Profil</Text>
        <NotificationBell />
      </View>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header with Banner */}
        <View style={styles.headerContainer}>
          {/* Banner Image */}
          <View style={styles.bannerContainer}>
            {profile?.banner_url ? (
              <Image source={{ uri: profile.banner_url }} style={styles.bannerImage} />
            ) : (
              <View style={styles.bannerPlaceholder} />
            )}
          </View>

          {/* Profile Info Card */}
          <View style={styles.profileCard}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.profilePicture}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.profilePictureImage} />
                ) : (
                  <User size={40} color={Colors.primary} />
                )}
              </View>
            </View>

            {/* Name & Username */}
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>
                  {profile?.name || 'User'}
                </Text>
                {profile?.phone_verified_at && (
                  <CheckCircle size={20} color={Colors.secondary} />
                )}
                {profile?.is_premium && (
                  <View style={styles.premiumBadgeSmall}>
                    <Crown size={14} color={Colors.white} />
                    <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                  </View>
                )}
                {profile?.is_admin && (
                  <View style={styles.adminBadgeSmall}>
                    <Shield size={14} color={Colors.white} />
                    <Text style={styles.adminBadgeText}>ADMIN</Text>
                  </View>
                )}
              </View>
              <Text style={styles.username}>@{profile?.username || 'username'}</Text>
              {profile?.bio && (
                <Text style={styles.bio} numberOfLines={3}>{profile.bio}</Text>
              )}
              <View style={styles.locationRow}>
                <MapPin size={14} color={Colors.gray600} />
                <Text style={styles.locationText}>
                  {profile?.city || 'Unbekannt'}
                </Text>
                <Calendar size={14} color={Colors.gray600} />
                <Text style={styles.locationText}>
                  Mitglied seit {profile?.created_at ? new Date(profile.created_at).getFullYear() : '----'}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryActionButton]}
                onPress={() => router.push('/profile/edit')}
              >
                <Edit size={16} color={Colors.white} />
                <Text style={styles.primaryActionButtonText}>Bearbeiten</Text>
              </TouchableOpacity>
            </View>

            {/* Social Stats */}
            <View style={styles.socialStats}>
              {socialStats.map((stat, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.socialStat}
                  onPress={() => stat.route && router.push(stat.route as any)}
                  disabled={!stat.route}
                >
                  <Text style={styles.socialStatValue}>{stat.value}</Text>
                  <Text style={styles.socialStatLabel}>{stat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Rewards & Level Card */}
        {!isGuest && (
          <View style={styles.rewardsCard}>
            <View style={styles.rewardsHeader}>
              <View style={styles.coinsSection}>
                <Coins size={24} color={Colors.accent} />
                <View style={styles.coinsInfo}>
                  <Text style={styles.coinsValue}>{formatCoins(coins)}</Text>
                  <Text style={styles.coinsLabel}>JETZZ Coins</Text>
                </View>
              </View>
              <View style={styles.levelBadge} backgroundColor={getLevelColor(level)}>
                <Award size={16} color={Colors.white} />
                <Text style={styles.levelText}>{level}</Text>
              </View>
            </View>

            {levelProgress.nextLevel && (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>
                    Fortschritt zu {levelProgress.nextLevel.level_name}
                  </Text>
                  <Text style={styles.progressPercent}>
                    {Math.round(levelProgress.progress)}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${levelProgress.progress}%` }
                    ]}
                  />
                </View>
                <Text style={styles.progressInfo}>
                  {likesReceived} / {levelProgress.nextLevel.min_likes} Likes
                </Text>
              </View>
            )}

            <View style={styles.rewardsActions}>
              <TouchableOpacity
                style={styles.buyCoinsButton}
                onPress={() => router.push('/rewards' as any)}
              >
                <Coins size={18} color={Colors.white} />
                <Text style={styles.buyCoinsButtonText}>Coins kaufen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rewardsButton}
                onPress={() => router.push('/rewards' as any)}
              >
                <TrendingUp size={16} color={Colors.primary} />
                <Text style={styles.rewardsButtonText}>Details ansehen</Text>
                <ChevronRight size={16} color={Colors.gray400} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Premium & Ad-Free Hours Widgets */}
        {!isGuest && user && (
          <>
            {/* Show Premium Button only when no active/trialing subscription */}
            {(!subscriptionStatus ||
              !subscriptionStatus.subscription ||
              !['active', 'trialing'].includes(subscriptionStatus.subscription.status)) && (
              <TouchableOpacity
                style={styles.premiumBanner}
                onPress={() => setShowPremiumModal(true)}
              >
                <View style={styles.premiumBannerContent}>
                  <Shield size={24} color={Colors.accent} />
                  <View style={styles.premiumTextContainer}>
                    <Text style={styles.premiumTitle}>JETZZ Premium</Text>
                    <Text style={styles.premiumSubtitle}>Werbefrei & exklusive Features</Text>
                  </View>
                </View>
                <ChevronRight size={20} color={Colors.gray400} />
              </TouchableOpacity>
            )}

            <AdFreeHoursWidget userId={user.id} />
          </>
        )}

        {/* My Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meine Inhalte</Text>
          
          {/* Photos */}
          <View style={styles.contentSubsection}>
            <View style={styles.contentHeader}>
              <Camera size={20} color={Colors.gray600} />
              <Text style={styles.contentSubtitle}>Fotos</Text>
            </View>
            <View style={styles.photosGrid}>
              {mockPhotos.map((photo, index) => (
                <TouchableOpacity key={index} style={styles.photoItem}>
                  <Image source={{ uri: photo }} style={styles.photoImage} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Live Streams */}
          <View style={styles.contentSubsection}>
            <View style={styles.contentHeader}>
              <Video size={20} color={Colors.error} />
              <Text style={styles.contentSubtitle}>Live-Streams</Text>
              <View style={styles.liveIndicator}>
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            <View style={styles.liveStreamCard}>
              <Text style={styles.liveStreamText}>Keine aktiven Live-Streams</Text>
              <Text style={styles.liveStreamSubtext}>Starte einen Stream um Live-Momente zu teilen</Text>
            </View>
          </View>
        </View>

        {/* My Created Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meine erstellten Events</Text>
          <View style={styles.createdEventsContainer}>
            {loading ? (
              <View style={styles.createdEventCard}>
                <Text style={styles.loadingText}>Lade Events...</Text>
              </View>
            ) : userEvents.length > 0 ? (
              userEvents.slice(0, 5).map((event: any) => (
                <View key={event.id} style={styles.createdEventCard}>
                  <View style={styles.createdEventHeader}>
                    <Text style={styles.createdEventTitle}>{event.title}</Text>
                    <View style={[
                      styles.eventStatusBadge,
                      !isUpcoming(event.start_date) && styles.pastEventBadge
                    ]}>
                      <Text style={styles.eventStatusText}>
                        {isUpcoming(event.start_date) ? 'Bevorstehend' : 'Vergangen'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.createdEventDate}>
                    {formatEventDate(event.start_date, event.start_time)}
                  </Text>
                  <Text style={styles.createdEventLocation}>
                    {[event.street, event.city].filter(Boolean).join(', ')}
                  </Text>
                  <View style={styles.createdEventStats}>
                    <Text style={styles.createdEventParticipants}>
                      {event.attendees} Teilnehmer
                    </Text>
                    <TouchableOpacity
                      style={styles.manageEventButton}
                      onPress={() => router.push(`/event/${event.id}`)}
                    >
                      <Text style={styles.manageEventButtonText}>
                        {isUpcoming(event.start_date) ? 'Verwalten' : 'Ansehen'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.createdEventCard}>
                <Text style={styles.emptyEventText}>Du hast noch keine Events erstellt</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Access */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schnellzugriff</Text>
          {quickAccessItems.map((item, index) => (
            <TouchableOpacity key={index} onPress={item.onPress}>
              <View style={styles.listItem}>
                <View style={styles.listItemContent}>
                  <View style={styles.listItemLeft}>
                    <View style={styles.listItemIcon}>
                      <item.icon size={20} color={Colors.primary} />
                    </View>
                    <Text style={styles.listItemText}>{item.label}</Text>
                  </View>
                  <ChevronRight size={20} color={Colors.gray400} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Optionen</Text>
          {optionItems.map((item, index) => (
            <TouchableOpacity key={index} onPress={item.onPress}>
              <View style={[
                styles.listItem,
                (item as any).isAdmin && styles.adminListItem
              ]}>
                <View style={styles.listItemContent}>
                  <View style={styles.listItemLeft}>
                    <View style={[
                      styles.listItemIcon,
                      (item as any).isAdmin && styles.adminIcon
                    ]}>
                      <item.icon size={20} color={(item as any).isAdmin ? Colors.primary : Colors.gray600} />
                    </View>
                    <Text style={[
                      styles.listItemText,
                      (item as any).isAdmin && styles.adminText
                    ]}>{item.label}</Text>
                  </View>
                  <ChevronRight size={20} color={(item as any).isAdmin ? Colors.primary : Colors.gray400} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>JETZZ App v1.0.0</Text>
        </View>
      </ScrollView>

      {showPremiumModal && user && (
        <PremiumUpgradeModal
          visible={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          userId={user.id}
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
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray300,
  },
  headerBarLeft: {
    width: 40,
  },
  headerBarTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
  },
  headerContainer: {
    marginBottom: Spacing.lg,
  },
  bannerContainer: {
    position: 'relative',
    height: 180,
    backgroundColor: Colors.gray300,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primaryLight,
  },
  editBannerButton: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: -60,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginTop: -50,
    marginBottom: Spacing.md,
    position: 'relative',
  },
  profilePicture: {
    width: 100,
    height: 100,
    backgroundColor: Colors.primaryLight,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
  },
  profilePictureImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  profileName: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
  },
  username: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    marginBottom: Spacing.sm,
  },
  bio: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  locationText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginRight: Spacing.sm,
  },
  actionButtons: {
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.gray300,
  },
  primaryActionButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  primaryActionButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  socialStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  socialStat: {
    alignItems: 'center',
    gap: 4,
  },
  socialStatValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
  },
  socialStatLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: Spacing.lg,
  },
  contentSubsection: {
    marginBottom: Spacing.lg,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  contentSubtitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray800,
  },
  liveIndicator: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  liveText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  photosGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  photoItem: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  liveStreamCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  liveStreamText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.gray600,
    marginBottom: 4,
  },
  liveStreamSubtext: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  listItem: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  listItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    backgroundColor: Colors.white,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.gray800,
  },
  adminListItem: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  adminIcon: {
    backgroundColor: Colors.primary + '20',
  },
  adminText: {
    color: Colors.primary,
    fontWeight: FontWeights.bold,
  },
  premiumBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  premiumBadgeText: {
    fontSize: FontSizes.xs,
    color: Colors.white,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.5,
  },
  adminBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  adminBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  footerText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  createdEventsContainer: {
    gap: Spacing.md,
  },
  createdEventCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  createdEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  createdEventTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    flex: 1,
  },
  eventStatusBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  pastEventBadge: {
    backgroundColor: Colors.gray500,
  },
  eventStatusText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  createdEventDate: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
    marginBottom: 4,
  },
  createdEventLocation: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginBottom: Spacing.md,
  },
  createdEventStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createdEventParticipants: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  manageEventButton: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  manageEventButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
    padding: Spacing.lg,
  },
  emptyEventText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
    padding: Spacing.lg,
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  guestIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  guestTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  guestDescription: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  guestBenefits: {
    width: '100%',
    backgroundColor: Colors.gray100,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xxl,
  },
  guestBenefitsTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray800,
    marginBottom: Spacing.md,
  },
  guestBenefitItem: {
    fontSize: FontSizes.md,
    color: Colors.gray700,
    marginBottom: Spacing.sm,
  },
  guestRegisterButton: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  guestRegisterButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  guestLoginButton: {
    paddingVertical: Spacing.md,
  },
  guestLoginButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  rewardsCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rewardsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  coinsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  coinsInfo: {
    flexDirection: 'column',
  },
  coinsValue: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  coinsLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  levelText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  progressSection: {
    marginBottom: Spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    fontWeight: FontWeights.medium,
  },
  progressPercent: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.bold,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  progressInfo: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    textAlign: 'center',
  },
  rewardsActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  buyCoinsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
  },
  buyCoinsButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  rewardsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  rewardsButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  premiumBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  premiumTextContainer: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  premiumSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
});