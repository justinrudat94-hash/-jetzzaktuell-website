import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Linking,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { X, MapPin, Calendar, Clock, Users, Share2, Video, Image as ImageIcon, DollarSign, ExternalLink, CreditCard as Edit, Ticket, Info, Navigation as NavigationIcon, Phone, Mail, Globe, CircleCheck as CheckCircle, Circle as XCircle, Gift, CreditCard as IdCard, Sparkles, Music, Award } from 'lucide-react-native';
import { Colors } from '../constants';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';
import { router } from 'expo-router';
import { formatPrice, getTicketButtonText } from '../utils/formatters';
import { useParticipation } from '../hooks/useParticipation';
import LiveStreamModal from './LiveStreamModal';
import EventGalleryModal from './EventGalleryModal';
import LikeButton from './LikeButton';
import ShareModal from './ShareModal';

const { width, height } = Dimensions.get('window');

interface EventDetailModalProps {
  visible: boolean;
  event: any;
  onClose: () => void;
  onEdit?: () => void;
  isOwnEvent?: boolean;
  onParticipationChange?: () => void;
}

export default function EventDetailModal({
  visible,
  event,
  onClose,
  onEdit,
  isOwnEvent = false,
  onParticipationChange,
}: EventDetailModalProps) {
  const [showLiveStream, setShowLiveStream] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const { isParticipating, toggleParticipation } = useParticipation();
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerTranslateY = useRef(new Animated.Value(0)).current;

  if (!event) return null;

  const handleShare = () => {
    setShowShareModal(true);
  };


  const formatDate = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  const getLocationText = (event: any) => {
    if (event.city || event.postcode || event.street) {
      const parts = [];
      if (event.street) parts.push(event.street);
      if (event.postcode && event.city) {
        parts.push(`${event.postcode} ${event.city}`);
      } else if (event.city) {
        parts.push(event.city);
      } else if (event.postcode) {
        parts.push(event.postcode);
      }
      return parts.join('\n');
    }

    if (event.location) {
      return event.location;
    }

    if (event.address) {
      return event.address;
    }

    return 'Ort wird nachgetragen';
  };

  const openLink = (url: string) => {
    if (url) {
      Linking.openURL(url).catch((err) => console.error('Error opening link:', err));
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const delta = currentScrollY - lastScrollY.current;

    if (delta > 5 && currentScrollY > 50) {
      Animated.timing(headerTranslateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (delta < -5 || currentScrollY < 50) {
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }

    lastScrollY.current = currentScrollY;
  };

  const eventImage = event.preview_image_url || event.image_url || event.image || 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg';
  const hasMultipleImages = event.image_urls && event.image_urls.length > 0;
  const hasLineup = event.lineup && Array.isArray(event.lineup) && event.lineup.length > 0;

  console.log('🖼️ EventDetailModal - Image URL:', eventImage);

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        statusBarTranslucent
      >
        <StatusBar barStyle="light-content" />
        <View style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            bounces={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => hasMultipleImages && setShowGallery(true)}
              style={styles.imageContainer}
            >
              <Image
                source={{ uri: eventImage }}
                style={styles.mainImage}
                resizeMode="cover"
                onError={(error) => {
                  console.error('❌ Image load error:', error.nativeEvent?.error);
                }}
                onLoad={() => {
                  console.log('✅ Image loaded successfully');
                }}
              />
              <TouchableOpacity onPress={onClose} style={styles.closeButtonOverlay}>
                <X size={24} color={Colors.white} />
              </TouchableOpacity>
              {hasMultipleImages && (
                <View style={styles.galleryBadge}>
                  <ImageIcon size={16} color={Colors.white} />
                  <Text style={styles.galleryText}>
                    {event.image_urls.length + 1} Bilder
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.actionBar}>
              {isOwnEvent && onEdit && (
                <TouchableOpacity onPress={onEdit} style={styles.actionButtonBottom}>
                  <Edit size={22} color={Colors.text} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleShare} style={[styles.actionButtonBottom, styles.shareButton]}>
                <Share2 size={22} color={Colors.white} />
              </TouchableOpacity>
              <View style={styles.likeButtonWrapper}>
                <LikeButton
                  targetType="event"
                  targetId={event.id}
                  showCount={false}
                  compact={true}
                />
              </View>
            </View>

            <View style={styles.contentContainer}>
              <View style={styles.titleSection}>
                <View style={styles.headerRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{event.category}</Text>
                  </View>
                  {event.season_special && (
                    <View style={styles.seasonBadge}>
                      <Sparkles size={14} color={Colors.accent} />
                      <Text style={styles.seasonBadgeText}>{event.season_special}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.title}>{event.title}</Text>
              </View>

              {formatPrice(event.price, event.external_source, event.is_free) && (
                <View style={styles.priceCard}>
                  <DollarSign size={24} color={Colors.success} />
                  <View style={styles.priceInfo}>
                    <Text style={styles.priceLabel}>Eintritt</Text>
                    <Text style={styles.priceText}>
                      {formatPrice(event.price, event.external_source, event.is_free)}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.infoCards}>
                <View style={styles.infoCard}>
                  <View style={styles.infoCardIcon}>
                    <Calendar size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.infoCardContent}>
                    <Text style={styles.infoCardLabel}>Datum</Text>
                    <Text style={styles.infoCardText}>
                      {formatDate(event.start_date || event.date)}
                    </Text>
                    {event.end_date && event.end_date !== event.start_date && (
                      <Text style={styles.infoCardSubtext}>
                        bis {formatDate(event.end_date)}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.infoCard}>
                  <View style={styles.infoCardIcon}>
                    <Clock size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.infoCardContent}>
                    <Text style={styles.infoCardLabel}>Uhrzeit</Text>
                    <Text style={styles.infoCardText}>
                      {event.end_time && formatTime(event.start_time || event.time) !== formatTime(event.end_time)
                        ? `${formatTime(event.start_time || event.time)} - ${formatTime(event.end_time)}`
                        : `Ab ${formatTime(event.start_time || event.time)}`
                      }
                    </Text>
                  </View>
                </View>

                <View style={styles.infoCard}>
                  <View style={styles.infoCardIcon}>
                    <MapPin size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.infoCardContent}>
                    <Text style={styles.infoCardLabel}>Ort</Text>
                    <Text style={styles.infoCardText} numberOfLines={3}>
                      {getLocationText(event)}
                    </Text>
                  </View>
                </View>

                {(event.attendees !== undefined || event.current_participants !== undefined) && (
                  <View style={styles.infoCard}>
                    <View style={styles.infoCardIcon}>
                      <Users size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.infoCardContent}>
                      <Text style={styles.infoCardLabel}>Teilnehmer</Text>
                      <Text style={styles.infoCardText}>
                        {event.attendees || event.current_participants || 0} Personen
                      </Text>
                      {event.max_participants && (
                        <Text style={styles.infoCardSubtext}>
                          Max. {event.max_participants}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {event.description && (
                <View style={styles.descriptionSection}>
                  <View style={styles.sectionHeader}>
                    <Info size={20} color={Colors.gray700} />
                    <Text style={styles.sectionTitle}>Beschreibung</Text>
                  </View>
                  <Text style={styles.description}>{event.description}</Text>
                </View>
              )}

              {hasLineup && (
                <View style={styles.lineupSection}>
                  <View style={styles.sectionHeader}>
                    <Music size={20} color={Colors.gray700} />
                    <Text style={styles.sectionTitle}>Line-up / Programm</Text>
                  </View>
                  <View style={styles.lineupList}>
                    {event.lineup.map((item: any, index: number) => (
                      <View key={index} style={styles.lineupItem}>
                        <View style={styles.lineupHeader}>
                          <Text style={styles.lineupNumber}>{index + 1}</Text>
                          <View style={styles.lineupTimeContainer}>
                            {item.startTime && (
                              <Text style={styles.lineupTime}>
                                {item.startTime}
                                {item.endTime && ` - ${item.endTime}`}
                              </Text>
                            )}
                          </View>
                        </View>
                        <Text style={styles.lineupName}>{item.name}</Text>
                        {item.description && (
                          <Text style={styles.lineupDescription}>{item.description}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {event.additional_info && (
                <View style={styles.additionalInfoSection}>
                  <View style={styles.sectionHeader}>
                    <Info size={20} color={Colors.gray700} />
                    <Text style={styles.sectionTitle}>Zusätzliche Informationen</Text>
                  </View>
                  <Text style={styles.additionalInfoText}>{event.additional_info}</Text>
                </View>
              )}

              {event.age_rating && (
                <View style={styles.ageRatingSection}>
                  <View style={styles.sectionHeader}>
                    <IdCard size={20} color={Colors.gray700} />
                    <Text style={styles.sectionTitle}>Jugendschutz</Text>
                  </View>
                  <View style={styles.ageRatingBadge}>
                    <Text style={styles.ageRatingText}>{event.age_rating}</Text>
                  </View>
                </View>
              )}

              {(event.tickets_required || event.id_required || event.vouchers_available) && (
                <View style={styles.optionsSection}>
                  <View style={styles.sectionHeader}>
                    <CheckCircle size={20} color={Colors.gray700} />
                    <Text style={styles.sectionTitle}>Optionen & Hinweise</Text>
                  </View>
                  <View style={styles.optionsList}>
                    {event.tickets_required && (
                      <View style={styles.optionItem}>
                        <CheckCircle size={18} color={Colors.success} />
                        <Text style={styles.optionText}>Tickets erforderlich</Text>
                      </View>
                    )}
                    {event.id_required && (
                      <View style={styles.optionItem}>
                        <CheckCircle size={18} color={Colors.success} />
                        <Text style={styles.optionText}>Ausweis erforderlich</Text>
                      </View>
                    )}
                    {event.vouchers_available && (
                      <View style={styles.optionItem}>
                        <Gift size={18} color={Colors.success} />
                        <Text style={styles.optionText}>Gutscheine verfügbar</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {event.sponsors && (
                <View style={styles.sponsorsSection}>
                  <View style={styles.sectionHeader}>
                    <Award size={20} color={Colors.gray700} />
                    <Text style={styles.sectionTitle}>Sponsoren & Partner</Text>
                  </View>
                  <Text style={styles.sponsorsText}>{event.sponsors}</Text>
                </View>
              )}

              {(event.contact_email || event.contact_phone || event.contact_website) && (
                <View style={styles.contactSection}>
                  <View style={styles.sectionHeader}>
                    <Phone size={20} color={Colors.gray700} />
                    <Text style={styles.sectionTitle}>Kontakt</Text>
                  </View>
                  <View style={styles.contactList}>
                    {event.contact_email && (
                      <TouchableOpacity
                        style={styles.contactItem}
                        onPress={() => openLink(`mailto:${event.contact_email}`)}
                      >
                        <Mail size={18} color={Colors.primary} />
                        <Text style={styles.contactText}>{event.contact_email}</Text>
                      </TouchableOpacity>
                    )}
                    {event.contact_phone && (
                      <TouchableOpacity
                        style={styles.contactItem}
                        onPress={() => openLink(`tel:${event.contact_phone}`)}
                      >
                        <Phone size={18} color={Colors.primary} />
                        <Text style={styles.contactText}>{event.contact_phone}</Text>
                      </TouchableOpacity>
                    )}
                    {event.contact_website && (
                      <TouchableOpacity
                        style={styles.contactItem}
                        onPress={() => openLink(event.contact_website)}
                      >
                        <Globe size={18} color={Colors.primary} />
                        <Text style={styles.contactText}>{event.contact_website}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.actionButtonsContainer}>
                {getTicketButtonText(event.external_source, event.ticket_url || event.ticket_link) && (
                  <TouchableOpacity
                    style={styles.ticketButton}
                    onPress={() => openLink(event.ticket_link || event.ticket_url || '')}
                  >
                    <Ticket size={20} color={Colors.white} />
                    <Text style={styles.ticketButtonText}>{getTicketButtonText(event.external_source, event.ticket_url || event.ticket_link)}</Text>
                  </TouchableOpacity>
                )}

                {!isOwnEvent && (
                  <TouchableOpacity
                    style={[
                      styles.participateButton,
                      isParticipating(event.id) && styles.participatingButton
                    ]}
                    onPress={async () => {
                      await toggleParticipation(event.id);
                      if (onParticipationChange) {
                        onParticipationChange();
                      }
                    }}
                  >
                    <Users size={20} color={Colors.white} />
                    <Text style={styles.participateButtonText}>
                      {isParticipating(event.id) ? 'Abmelden' : 'Teilnehmen'}
                    </Text>
                  </TouchableOpacity>
                )}

                {isOwnEvent && (
                  <TouchableOpacity
                    style={styles.liveButton}
                    onPress={() => setShowLiveStream(true)}
                  >
                    <Video size={20} color={Colors.white} />
                    <Text style={styles.liveButtonText}>Live-Stream starten</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.navigationButton}>
                  <NavigationIcon size={20} color={Colors.primary} />
                  <Text style={styles.navigationButtonText}>Navigation starten</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <LiveStreamModal
        visible={showLiveStream}
        onClose={() => setShowLiveStream(false)}
        event={event}
      />

      <EventGalleryModal
        visible={showGallery}
        onClose={() => setShowGallery(false)}
        images={[eventImage, ...(event.image_urls || [])]}
      />

      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        event={event}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    width: width,
    height: height * 0.5,
    backgroundColor: Colors.gray100,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  closeButtonOverlay: {
    position: 'absolute',
    top: 50,
    left: Spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  actionButtonBottom: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.gray300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  likeButtonWrapper: {
    marginLeft: 0,
  },
  galleryBadge: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backdropFilter: 'blur(10px)',
  },
  galleryText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  contentContainer: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  titleSection: {
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  categoryText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  seasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  seasonBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.success + '15',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: Colors.success + '30',
  },
  priceInfo: {
    flex: 1,
  },
  priceLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    fontWeight: FontWeights.medium,
    marginBottom: 2,
  },
  priceText: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.success,
  },
  infoCards: {
    gap: Spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.gray50,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  infoCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    fontWeight: FontWeights.medium,
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: FontSizes.md,
    color: Colors.gray900,
    fontWeight: FontWeights.semibold,
  },
  infoCardSubtext: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginTop: 2,
  },
  descriptionSection: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
  },
  description: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  lineupSection: {
    gap: Spacing.md,
  },
  lineupList: {
    gap: Spacing.md,
  },
  lineupItem: {
    backgroundColor: Colors.gray50,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  lineupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  lineupNumber: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    width: 30,
  },
  lineupTimeContainer: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  lineupTime: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  lineupName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  lineupDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
  additionalInfoSection: {
    gap: Spacing.md,
  },
  additionalInfoText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    lineHeight: 24,
    backgroundColor: Colors.gray50,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  ageRatingSection: {
    gap: Spacing.md,
  },
  ageRatingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.warning,
  },
  ageRatingText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.warning,
  },
  optionsSection: {
    gap: Spacing.md,
  },
  optionsList: {
    gap: Spacing.sm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
  },
  optionText: {
    fontSize: FontSizes.md,
    color: Colors.gray700,
    fontWeight: FontWeights.medium,
  },
  sponsorsSection: {
    gap: Spacing.md,
  },
  sponsorsText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    lineHeight: 24,
    backgroundColor: Colors.gray50,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  contactSection: {
    gap: Spacing.md,
  },
  contactList: {
    gap: Spacing.sm,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
  },
  contactText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
    flex: 1,
  },
  actionButtonsContainer: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  ticketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ticketButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  participateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  participatingButton: {
    backgroundColor: Colors.gray600,
    shadowColor: Colors.gray600,
  },
  participateButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  liveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.error,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  liveButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  navigationButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
});
