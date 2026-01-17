import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { ChevronRight, Ticket, TrendingUp } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants';
import { formatPrice } from '@/services/ticketService';

interface SoldTicketsCardProps {
  event: any;
  soldTickets: number;
  totalTickets: number;
  revenue: number;
  onPress: () => void;
}

export default function SoldTicketsCard({
  event,
  soldTickets,
  totalTickets,
  revenue,
  onPress,
}: SoldTicketsCardProps) {
  const percentage = totalTickets > 0 ? Math.round((soldTickets / totalTickets) * 100) : 0;
  const imageUrl = event.image || 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg';

  return (
    <TouchableOpacity onPress={onPress} style={styles.container} activeOpacity={0.7}>
      <ImageBackground source={{ uri: imageUrl }} style={styles.imageBackground} imageStyle={styles.image}>
        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              {event.title}
            </Text>
            <ChevronRight size={20} color={Colors.white} />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ticket size={16} color={Colors.white} />
              </View>
              <View>
                <Text style={styles.statLabel}>Verkauft</Text>
                <Text style={styles.statValue}>
                  {soldTickets}/{totalTickets}
                </Text>
              </View>
            </View>

            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <TrendingUp size={16} color={Colors.white} />
              </View>
              <View>
                <Text style={styles.statLabel}>Umsatz</Text>
                <Text style={styles.statValue}>{formatPrice(revenue)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${percentage}%` }]} />
            </View>
            <Text style={styles.progressText}>{percentage}% verkauft</Text>
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
    elevation: 3,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  imageBackground: {
    width: '100%',
    height: 180,
  },
  image: {
    borderRadius: BorderRadius.lg,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.white,
    flex: 1,
    marginRight: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.white,
    opacity: 0.9,
  },
  statValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  progressContainer: {
    marginTop: Spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.sm,
  },
  progressText: {
    fontSize: FontSizes.sm,
    color: Colors.white,
    marginTop: Spacing.xs,
    fontWeight: FontWeights.semibold,
  },
});
