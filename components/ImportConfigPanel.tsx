import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';
import { CATEGORY_OPTIONS, CITY_OPTIONS } from '../utils/ticketmasterQueryGenerator';

interface ImportConfigPanelProps {
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
  selectedCities: string[];
  onToggleCity: (city: string) => void;
  useCityFilter: boolean;
  onToggleCityFilter: () => void;
  selectedTimePeriods: number[];
  onToggleTimePeriod: (index: number) => void;
}

const TIME_PERIODS = [
  { index: 0, label: 'Nächste 2 Monate (0-60 Tage)', days: '0-60' },
  { index: 1, label: 'Monat 3-4 (61-120 Tage)', days: '61-120' },
  { index: 2, label: 'Monat 5-6 (121-180 Tage)', days: '121-180' },
  { index: 3, label: 'Monat 7-9 (181-270 Tage)', days: '181-270' },
  { index: 4, label: 'Monat 10-12 (271-365 Tage)', days: '271-365' },
];

export default function ImportConfigPanel({
  selectedCategories,
  onToggleCategory,
  selectedCities,
  onToggleCity,
  useCityFilter,
  onToggleCityFilter,
  selectedTimePeriods,
  onToggleTimePeriod,
}: ImportConfigPanelProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('categories');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const allCategoriesSelected = selectedCategories.length === CATEGORY_OPTIONS.length;
  const allTimesSelected = selectedTimePeriods.length === TIME_PERIODS.length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Import-Konfiguration</Text>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('time')}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>Zeitbereich</Text>
          {expandedSection === 'time' ? (
            <ChevronUp size={20} color={Colors.textSecondary} />
          ) : (
            <ChevronDown size={20} color={Colors.textSecondary} />
          )}
        </TouchableOpacity>
        {expandedSection === 'time' && (
          <View style={styles.sectionContent}>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => {
                  TIME_PERIODS.forEach((p) => {
                    if (!selectedTimePeriods.includes(p.index)) {
                      onToggleTimePeriod(p.index);
                    }
                  });
                }}
              >
                <Text style={styles.quickActionText}>Alle auswählen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => {
                  selectedTimePeriods.forEach((index) => {
                    onToggleTimePeriod(index);
                  });
                }}
              >
                <Text style={styles.quickActionText}>Keine</Text>
              </TouchableOpacity>
            </View>
            {TIME_PERIODS.map((period) => (
              <TouchableOpacity
                key={period.index}
                style={styles.checkboxItem}
                onPress={() => onToggleTimePeriod(period.index)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    selectedTimePeriods.includes(period.index) && styles.checkboxChecked,
                  ]}
                >
                  {selectedTimePeriods.includes(period.index) && (
                    <View style={styles.checkboxInner} />
                  )}
                </View>
                <View style={styles.checkboxLabel}>
                  <Text style={styles.checkboxText}>{period.label}</Text>
                  <Text style={styles.checkboxSubtext}>{period.days} Tage</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('categories')}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>
            Kategorien ({selectedCategories.length}/{CATEGORY_OPTIONS.length})
          </Text>
          {expandedSection === 'categories' ? (
            <ChevronUp size={20} color={Colors.textSecondary} />
          ) : (
            <ChevronDown size={20} color={Colors.textSecondary} />
          )}
        </TouchableOpacity>
        {expandedSection === 'categories' && (
          <View style={styles.sectionContent}>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => {
                  CATEGORY_OPTIONS.forEach((cat) => {
                    if (!selectedCategories.includes(cat.key)) {
                      onToggleCategory(cat.key);
                    }
                  });
                }}
              >
                <Text style={styles.quickActionText}>Alle auswählen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => {
                  selectedCategories.forEach((cat) => {
                    onToggleCategory(cat);
                  });
                }}
              >
                <Text style={styles.quickActionText}>Keine</Text>
              </TouchableOpacity>
            </View>
            {CATEGORY_OPTIONS.map((category) => (
              <TouchableOpacity
                key={category.key}
                style={styles.checkboxItem}
                onPress={() => onToggleCategory(category.key)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    selectedCategories.includes(category.key) && styles.checkboxChecked,
                  ]}
                >
                  {selectedCategories.includes(category.key) && (
                    <View style={styles.checkboxInner} />
                  )}
                </View>
                <View style={styles.checkboxLabel}>
                  <Text style={styles.checkboxText}>{category.label}</Text>
                  <Text style={styles.checkboxSubtext}>{category.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('cities')}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>
            Städte-Filter {useCityFilter ? `(${selectedCities.length} ausgewählt)` : '(Aus)'}
          </Text>
          {expandedSection === 'cities' ? (
            <ChevronUp size={20} color={Colors.textSecondary} />
          ) : (
            <ChevronDown size={20} color={Colors.textSecondary} />
          )}
        </TouchableOpacity>
        {expandedSection === 'cities' && (
          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={onToggleCityFilter}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleLabel}>Städte-Filter verwenden</Text>
              <View style={[styles.toggle, useCityFilter && styles.toggleActive]}>
                <View style={[styles.toggleThumb, useCityFilter && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
            {useCityFilter && (
              <>
                <Text style={styles.hint}>
                  Hinweis: Mehr Städte = mehr Queries = längerer Import
                </Text>
                <View style={styles.quickActions}>
                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => {
                      CITY_OPTIONS.forEach((city) => {
                        if (!selectedCities.includes(city)) {
                          onToggleCity(city);
                        }
                      });
                    }}
                  >
                    <Text style={styles.quickActionText}>Alle auswählen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => {
                      selectedCities.forEach((city) => {
                        onToggleCity(city);
                      });
                    }}
                  >
                    <Text style={styles.quickActionText}>Keine</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.cityGrid}>
                  {CITY_OPTIONS.map((city) => (
                    <TouchableOpacity
                      key={city}
                      style={[
                        styles.cityChip,
                        selectedCities.includes(city) && styles.cityChipSelected,
                      ]}
                      onPress={() => onToggleCity(city)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.cityChipText,
                          selectedCities.includes(city) && styles.cityChipTextSelected,
                        ]}
                      >
                        {city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}
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
  section: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  sectionContent: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickActionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.md,
  },
  quickActionText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.text,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    marginTop: 2,
  },
  checkboxChecked: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: Colors.white,
  },
  checkboxLabel: {
    flex: 1,
  },
  checkboxText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    marginBottom: Spacing.xs / 2,
  },
  checkboxSubtext: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  toggleLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.text,
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  hint: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
  cityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  cityChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cityChipSelected: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  cityChipText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  cityChipTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },
});
