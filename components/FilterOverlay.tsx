import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import { X, Calendar, Sparkles } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';
import CalendarModal from './CalendarModal';

interface FilterOverlayProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterState) => void;
}

interface FilterState {
  distance: number;
  priceRange: string;
  selectedDate: string | null;
  seasonSpecial: string;
}

const priceOptions = [
  { id: 'free', label: 'Kostenlos' },
  { id: 'under10', label: 'Unter 10 €' },
  { id: 'under50', label: 'Unter 50 €' },
  { id: 'over50', label: 'Über 50 €' },
];

const distancePresets = [5, 10, 25, 50];

export default function FilterOverlay({ visible, onClose, onApplyFilters }: FilterOverlayProps) {
  const [distance, setDistance] = useState(25);
  const [selectedPrice, setSelectedPrice] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [seasonSpecial, setSeasonSpecial] = useState('');
  const [calendarVisible, setCalendarVisible] = useState(false);

  const handleReset = () => {
    setDistance(25);
    setSelectedPrice('');
    setSelectedDate(null);
    setSeasonSpecial('');
  };

  const handleApply = () => {
    const filters: FilterState = {
      distance,
      priceRange: selectedPrice,
      selectedDate,
      seasonSpecial,
    };
    onApplyFilters(filters);
    onClose();
  };

  const handleCalendarOpen = () => {
    setCalendarVisible(true);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setCalendarVisible(false);
  };

  const handleDistancePreset = (preset: number) => {
    setDistance(preset);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <View style={styles.modal}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Filter Events</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={Colors.gray600} />
              </TouchableOpacity>
            </View>

            {/* Calendar Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kalender</Text>
              <TouchableOpacity style={styles.calendarRow} onPress={handleCalendarOpen}>
                <Text style={styles.calendarLabel}>
                  {selectedDate 
                    ? new Date(selectedDate).toLocaleDateString('de-DE')
                    : 'Kalender öffnen'
                  }
                </Text>
                <Calendar size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Distance Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Entfernung</Text>
              <Text style={styles.distanceValue}>{distance} km</Text>
              
              {/* Slider */}
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>1km</Text>
                <View style={styles.sliderWrapper}>
                  <View style={styles.sliderTrack}>
                    <View 
                      style={[
                        styles.sliderFill, 
                        { width: `${((distance - 1) / (50 - 1)) * 100}%` }
                      ]} 
                    />
                    <View 
                      style={[
                        styles.sliderThumb, 
                        { left: `${((distance - 1) / (50 - 1)) * 100}%` }
                      ]} 
                    />
                  </View>
                </View>
                <Text style={styles.sliderLabel}>50km</Text>
              </View>

              {/* Preset Buttons */}
              <View style={styles.presetButtons}>
                {distancePresets.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.presetButton,
                      distance === preset && styles.presetButtonActive
                    ]}
                    onPress={() => handleDistancePreset(preset)}
                  >
                    <Text style={[
                      styles.presetButtonText,
                      distance === preset && styles.presetButtonTextActive
                    ]}>
                      {preset} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Price Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preis</Text>
              <View style={styles.priceOptions}>
                {priceOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.radioOption}
                    onPress={() => setSelectedPrice(option.id)}
                  >
                    <View style={styles.radioButton}>
                      {selectedPrice === option.id && (
                        <View style={styles.radioButtonSelected} />
                      )}
                    </View>
                    <Text style={styles.radioLabel}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Season Special Section */}
            <View style={styles.section}>
              <View style={styles.seasonHeader}>
                <Sparkles size={20} color={Colors.accent} />
                <Text style={styles.sectionTitle}>Saison Spezial</Text>
              </View>
              <View style={styles.seasonGrid}>
                <TouchableOpacity
                  style={[
                    styles.seasonChip,
                    seasonSpecial === '' && styles.seasonChipActive
                  ]}
                  onPress={() => setSeasonSpecial('')}
                >
                  <Text style={[
                    styles.seasonChipText,
                    seasonSpecial === '' && styles.seasonChipTextActive
                  ]}>Alle</Text>
                </TouchableOpacity>
                {SEASON_SPECIALS.map((season) => (
                  <TouchableOpacity
                    key={season}
                    style={[
                      styles.seasonChip,
                      seasonSpecial === season && styles.seasonChipActive
                    ]}
                    onPress={() => setSeasonSpecial(season)}
                  >
                    <Text style={[
                      styles.seasonChipText,
                      seasonSpecial === season && styles.seasonChipTextActive
                    ]}>{season}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
        
        {/* Calendar Modal */}
        <CalendarModal
          visible={calendarVisible}
          onClose={() => setCalendarVisible(false)}
          onDateSelect={handleDateSelect}
          selectedDate={selectedDate || undefined}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '80%',
  },
  modal: {
    paddingBottom: Spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.gray300,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray200,
    marginHorizontal: Spacing.xl,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  calendarLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.gray800,
  },
  distanceValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  sliderLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.gray600,
    minWidth: 30,
  },
  sliderWrapper: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 6,
    backgroundColor: Colors.gray200,
    borderRadius: 3,
    position: 'relative',
  },
  sliderFill: {
    height: 6,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    top: -7,
    width: 20,
    height: 20,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    marginLeft: -10,
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  presetButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  presetButton: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  presetButtonActive: {
    backgroundColor: Colors.primary,
  },
  presetButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.gray700,
  },
  presetButtonTextActive: {
    color: Colors.white,
  },
  priceOptions: {
    gap: Spacing.md,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  radioLabel: {
    fontSize: FontSizes.md,
    color: Colors.gray800,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  resetButton: {
    flex: 1,
    backgroundColor: Colors.gray200,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
  },
  applyButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  seasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  seasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  seasonChip: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  seasonChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  seasonChipText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.gray700,
  },
  seasonChipTextActive: {
    color: Colors.white,
  },
});