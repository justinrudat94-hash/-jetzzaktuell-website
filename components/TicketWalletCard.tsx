import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { Calendar, MapPin, Ticket } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants';
import { TicketPurchase, getTicketStatusBadge, formatPrice } from '@/services/ticketService';

interface TicketWalletCardProps {
  ticket: TicketPurchase;
  onPress: () => void;
}

export default function TicketWalletCard({ ticket, onPress }: TicketWalletCardProps) {
  const statusBadge = getTicketStatusBadge(ticket);
  const event = ticket.event;

  if (!event) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const imageUrl = event.image || 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg';

  return (
    <TouchableOpacity onPress={onPress} style={styles.container} activeOpacity={0.9}>
      <ImageBackground source={{ uri: imageUrl }} style={styles.imageBackground} imageStyle={styles.image}>
        <View style={styles.overlay}>
          <View style={styles.header}>
            <View style={[styles.statusBadge, { backgroundColor: statusBadge.color }]}>
              <Text style={styles.statusText}>{statusBadge.text}</Text>
            </View>
            <View style={styles.ticketTypeBadge}>
              <Ticket size={14} color={Colors.white} />
              <Text style={styles.ticketTypeText}>{ticket.ticket?.ticket_type || 'Standard'}</Text>
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={2}>
              {event.title}
            </Text>

            <View style={styles.detailsRow}>
              <Calendar size={16} color={Colors.white} />
              <Text style={styles.detailText}>
                {formatDate(event.start_date)}
                {event.start_time && ` • ${event.start_time} Uhr`}
              </Text>
            </View>

            <View style={styles.detailsRow}>
              <MapPin size={16} color={Colors.white} />
              <Text style={styles.detailText} numberOfLines={1}>
                {event.city}
                {event.street && `, ${event.street}`}
              </Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.priceText}>{formatPrice(ticket.total_price)}</Text>
              <Text style={styles.quantityText}>
                {ticket.quantity} {ticket.quantity === 1 ? 'Ticket' : 'Tickets'}
              </Text>
            </View>
          </View>

          <View style={styles.qrPreview}>
            <View style={styles.qrPlaceholder}>
              <Ticket size={24} color={Colors.white} />
            </View>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  imageBackground: {
    width: '100%',
    height: 220,
  },
  image: {
    borderRadius: BorderRadius.lg,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },
  ticketTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  ticketTypeText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  detailText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  priceText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  quantityText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    opacity: 0.9,
  },
  qrPreview: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
  },
  qrPlaceholder: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
