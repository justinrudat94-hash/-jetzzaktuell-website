import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { MapPin, Clock, Users, Sparkles, Calendar, Star, Flame, Gem } from 'lucide-react-native';
import { router } from 'expo-router';
import { Event } from '../types';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';
import { formatAttendeesText, formatEventTime, formatPrice, getTicketButtonText } from '../utils/formatters';
import LikeButton from './LikeButton';
import { ReportButton } from './ReportButton';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - (Spacing.xl * 2);

interface EventCardProps {
  event: Event;
  showDistance?: boolean;
  distance?: number;
  onPress?: (event: Event) => void;
}

function EventCard({ event, showDistance, distance, onPress }: EventCardProps) {
  const handlePress = () => {
    if (onPress) {
      onPress(event);
    } else {
      console.warn('⚠️ EventCard: No onPress handler provided. Event cards should always have an onPress handler.');
    }
  };

  const handleLivePress = (e: any) => {
    e.stopPropagation();
    router.push('/live');
  };

  const eventImage = event.image || event.preview_image_url || event.image_url || 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.95}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: eventImage }}
          style={styles.image}
          resizeMode="cover"
        />

        <View style={styles.imageGradient} />

        {event.isLive && (
          <TouchableOpacity
            style={styles.liveIndicator}
            onPress={handleLivePress}
            activeOpacity={0.8}
          >
            <View style={styles.livePulse} />
            <Text style={styles.liveText}>LIVE</Text>
          </TouchableOpacity>
        )}

        {event.season_special && (
          <View style={styles.seasonBadge}>
            <Sparkles size={14} color={Colors.white} />
            <Text style={styles.seasonBadgeText}>{event.season_special}</Text>
          </View>
        )}

        {showDistance && distance !== undefined && (
          <View style={styles.distanceBadge}>
            <MapPin size={12} color={Colors.white} />
            <Text style={styles.distanceBadgeText}>
              {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
            </Text>
          </View>
        )}

        {event.is_boosted && (
          <View style={styles.boostBadge}>
            {event.boost_type === 'spotlight' && event.boost_tier?.includes('business') ? (
              <Gem size={16} color={Colors.white} />
            ) : event.boost_type === 'spotlight' ? (
              <Flame size={16} color={Colors.white} />
            ) : (
              <Star size={16} color={Colors.white} fill={Colors.white} />
            )}
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{event.category}</Text>
          </View>
          {formatPrice(event.price, event.external_source, event.is_free) && (
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{formatPrice(event.price, event.external_source, event.is_free)}</Text>
            </View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>

        <View style={styles.detailsContainer}>
          <View style={styles.detailItem}>
            <Calendar size={16} color={Colors.gray600} />
            <Text style={styles.detailText} numberOfLines={1}>
              {formatEventTime(event.start_time || event.time, event.start_date || event.date, event.end_time || event.endTime)}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <MapPin size={16} color={Colors.gray600} />
            <Text style={styles.detailText} numberOfLines={1}>
              {event.city || event.location || event.address || 'Ort TBA'}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.attendeesContainer}>
            <Users size={16} color={Colors.gray500} />
            <Text style={styles.attendeesText}>
              {formatAttendeesText(event.attendees)}
            </Text>
          </View>

          <View style={styles.actionsContainer}>
            <LikeButton
              targetType="event"
              targetId={event.id}
              compact
              showCount={false}
            />
            <ReportButton
              entityType="event"
              entityId={typeof event.id === 'string' ? event.id : String(event.id)}
              entityOwnerId={event.user_id || event.creatorId}
              entityTitle={event.title}
              size={16}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default memo(EventCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  imageContainer: {
    position: 'relative',
    height: 220,
    backgroundColor: Colors.gray100,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'transparent',
  },
  liveIndicator: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  liveText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  seasonBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  seasonBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  distanceBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  distanceBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  boostBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.warning,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  categoryText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceContainer: {
    backgroundColor: Colors.success + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  price: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.success,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  detailsContainer: {
    gap: Spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  attendeesText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    fontWeight: FontWeights.medium,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
});