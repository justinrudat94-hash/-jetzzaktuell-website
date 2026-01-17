import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants';

interface TicketStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export default function TicketStatCard({
  title,
  value,
  icon: Icon,
  color = Colors.primary,
  subtitle,
  trend,
}: TicketStatCardProps) {
  const getTrendColor = () => {
    if (trend === 'up') return Colors.secondary;
    if (trend === 'down') return Colors.error;
    return Colors.gray500;
  };

  return (
    <View style={[styles.container, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          <Icon size={24} color={color} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>

      <Text style={[styles.value, { color }]}>{value}</Text>

      {subtitle && (
        <Text style={[styles.subtitle, trend && { color: getTrendColor() }]}>{subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.gray700,
    flex: 1,
  },
  value: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
});
