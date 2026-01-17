import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Clock, Zap, Target, Sparkles } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';

type ImportMode = 'quick' | 'standard' | 'full' | 'adaptive';

interface ImportModeOption {
  mode: ImportMode;
  label: string;
  description: string;
  queries: string;
  duration: string;
  events: string;
  icon: typeof Clock;
  recommended?: boolean;
}

const IMPORT_MODES: ImportModeOption[] = [
  {
    mode: 'quick',
    label: 'Quick Mode',
    description: 'Schneller Test oder tägliches Update',
    queries: '6 Queries',
    duration: '2-3 Minuten',
    events: '3.000-5.000 Events',
    icon: Zap,
  },
  {
    mode: 'standard',
    label: 'Standard Mode',
    description: 'Wöchentlicher Import (empfohlen)',
    queries: '30 Queries',
    duration: '8-12 Minuten',
    events: '15.000-25.000 Events',
    icon: Target,
    recommended: true,
  },
  {
    mode: 'full',
    label: 'Full Mode',
    description: 'Monatlicher Deep-Import',
    queries: '90 Queries',
    duration: '25-35 Minuten',
    events: '40.000-60.000 Events',
    icon: Clock,
  },
  {
    mode: 'adaptive',
    label: 'Adaptive Mode',
    description: 'Maximale Abdeckung, splittet automatisch',
    queries: 'Dynamisch (30-100)',
    duration: '15-45 Minuten',
    events: '50.000-80.000 Events',
    icon: Sparkles,
  },
];

interface ImportModeSelectorProps {
  selectedMode: ImportMode;
  onSelectMode: (mode: ImportMode) => void;
}

export default function ImportModeSelector({ selectedMode, onSelectMode }: ImportModeSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Import-Modus wählen</Text>
      <View style={styles.modesContainer}>
        {IMPORT_MODES.map((option) => (
          <TouchableOpacity
            key={option.mode}
            style={[
              styles.modeCard,
              selectedMode === option.mode && styles.modeCardSelected,
            ]}
            onPress={() => onSelectMode(option.mode)}
            activeOpacity={0.7}
          >
            {option.recommended && (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>Empfohlen</Text>
              </View>
            )}
            <View style={styles.modeHeader}>
              <View
                style={[
                  styles.iconContainer,
                  selectedMode === option.mode && styles.iconContainerSelected,
                ]}
              >
                <option.icon
                  size={24}
                  color={selectedMode === option.mode ? Colors.primary : Colors.textSecondary}
                />
              </View>
              <View style={styles.modeHeaderText}>
                <Text style={styles.modeLabel}>{option.label}</Text>
                <Text style={styles.modeDescription}>{option.description}</Text>
              </View>
            </View>
            <View style={styles.modeStats}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Queries:</Text>
                <Text style={styles.statValue}>{option.queries}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Dauer:</Text>
                <Text style={styles.statValue}>{option.duration}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Events:</Text>
                <Text style={styles.statValue}>{option.events}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  modesContainer: {
    gap: Spacing.md,
  },
  modeCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  modeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + '10',
  },
  recommendedBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: BorderRadius.sm,
  },
  recommendedText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  iconContainerSelected: {
    backgroundColor: Colors.primary + '20',
  },
  modeHeaderText: {
    flex: 1,
  },
  modeLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs / 2,
  },
  modeDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  modeStats: {
    gap: Spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.text,
  },
});
