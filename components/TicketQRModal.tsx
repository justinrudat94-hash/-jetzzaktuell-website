import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Share,
  Platform,
} from 'react-native';
import { X, Calendar, MapPin, Navigation, Share2, Info } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants';
import { TicketPurchase, formatPrice } from '@/services/ticketService';

interface TicketQRModalProps {
  visible: boolean;
  ticket: TicketPurchase;
  onClose: () => void;
}

export default function TicketQRModal({ visible, ticket, onClose }: TicketQRModalProps) {
  const [countdown, setCountdown] = useState('');
  const event = ticket.event;

  useEffect(() => {
    if (!event?.start_date) return;

    const updateCountdown = () => {
      const now = new Date();
      const eventDate = new Date(event.start_date);
      const diff = eventDate.getTime() - now.getTime();

      if (diff < 0) {
        setCountdown('Event vorbei');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setCountdown(`In ${days} Tag${days !== 1 ? 'en' : ''}`);
      } else if (hours > 0) {
        setCountdown(`In ${hours} Stunde${hours !== 1 ? 'n' : ''}`);
      } else {
        setCountdown(`In ${minutes} Minute${minutes !== 1 ? 'n' : ''}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, [event?.start_date]);

  if (!event) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Mein Ticket für ${event.title} am ${formatDate(event.start_date)}`,
        title: event.title,
      });
    } catch (error) {
      console.error('Error sharing ticket:', error);
    }
  };

  const handleNavigation = () => {
    if (!event.street || !event.city) return;

    const address = `${event.street}, ${event.city}`;
    const url = Platform.select({
      ios: `maps://maps.apple.com/?q=${encodeURIComponent(address)}`,
      android: `geo:0,0?q=${encodeURIComponent(address)}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    });

    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    }
  };

  const qrData = ticket.qr_code_data || `TICKET-${ticket.id}`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.gray800} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dein Ticket</Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.qrContainer}>
            <View style={styles.qrWrapper}>
              <QRCode value={qrData} size={220} />
            </View>
            <Text style={styles.qrText}>Zeige diesen Code am Eingang</Text>
            <Text style={styles.ticketId}>Ticket #{ticket.id.substring(0, 8).toUpperCase()}</Text>
          </View>

          {countdown && (
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>{countdown}</Text>
            </View>
          )}

          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{event.title}</Text>

            <View style={styles.infoRow}>
              <Calendar size={20} color={Colors.primary} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Datum</Text>
                <Text style={styles.infoText}>
                  {formatDate(event.start_date)}
                  {event.start_time && ` • ${event.start_time} Uhr`}
                </Text>
              </View>
            </View>

            {(event.street || event.city) && (
              <View style={styles.infoRow}>
                <MapPin size={20} color={Colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Ort</Text>
                  <Text style={styles.infoText}>
                    {event.street && `${event.street}, `}
                    {event.city}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.infoRow}>
              <Info size={20} color={Colors.primary} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Ticket-Typ</Text>
                <Text style={styles.infoText}>
                  {ticket.ticket?.ticket_type || 'Standard'} • {formatPrice(ticket.unit_price)}
                </Text>
              </View>
            </View>

            <View style={styles.quantityBox}>
              <Text style={styles.quantityLabel}>Anzahl</Text>
              <Text style={styles.quantityValue}>
                {ticket.quantity} {ticket.quantity === 1 ? 'Ticket' : 'Tickets'}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            {event.street && event.city && (
              <TouchableOpacity style={styles.actionButton} onPress={handleNavigation}>
                <Navigation size={20} color={Colors.primary} />
                <Text style={styles.actionButtonText}>Wegbeschreibung</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Share2 size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>Teilen</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Gekauft am {new Date(ticket.purchased_at).toLocaleDateString('de-DE')}
            </Text>
            {ticket.payment_intent_id && (
              <Text style={styles.transactionText}>
                Transaktions-ID: {ticket.payment_intent_id.substring(0, 16)}...
              </Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
  },
  content: {
    padding: Spacing.xl,
  },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    marginBottom: Spacing.xl,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  qrWrapper: {
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
  },
  qrText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  ticketId: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.xs,
  },
  countdownContainer: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  countdownText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  eventInfo: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  eventTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  infoLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  infoText: {
    fontSize: FontSizes.md,
    color: Colors.gray800,
    fontWeight: FontWeights.medium,
  },
  quantityBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  quantityLabel: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    fontWeight: FontWeights.medium,
  },
  quantityValue: {
    fontSize: FontSizes.md,
    color: Colors.gray800,
    fontWeight: FontWeights.bold,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  actionButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  footerText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginBottom: Spacing.xs,
  },
  transactionText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
});
