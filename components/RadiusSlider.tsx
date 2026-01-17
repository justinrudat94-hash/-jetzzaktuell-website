import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MapPin } from 'lucide-react-native';

interface RadiusSliderProps {
  radius: number;
  onRadiusChange: (radius: number) => void;
  minRadius?: number;
  maxRadius?: number;
  showNoLimit?: boolean;
  onToggleNoLimit?: (enabled: boolean) => void;
  noLimitEnabled?: boolean;
}

export default function RadiusSlider({
  radius,
  onRadiusChange,
  minRadius = 1,
  maxRadius = 500,
  showNoLimit = true,
  onToggleNoLimit,
  noLimitEnabled = false,
}: RadiusSliderProps) {
  const handleNoLimitToggle = () => {
    if (onToggleNoLimit) {
      onToggleNoLimit(!noLimitEnabled);
    }
  };
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MapPin size={20} color="#8B5CF6" />
        <Text style={styles.title}>
          {noLimitEnabled ? 'Umkreis: Unbegrenzt' : `Umkreis: ${radius}km`}
        </Text>
        {showNoLimit && (
          <TouchableOpacity
            onPress={handleNoLimitToggle}
            style={[
              styles.toggleButton,
              noLimitEnabled ? styles.toggleButtonActive : styles.toggleButtonInactive
            ]}
          >
            <Text style={[
              styles.toggleButtonText,
              noLimitEnabled ? styles.toggleButtonTextActive : styles.toggleButtonTextInactive
            ]}>
              Unbegrenzt
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {!noLimitEnabled && (
        <View style={styles.sliderContainer}>
          <Text style={styles.minLabel}>{minRadius}km</Text>
          <View style={styles.sliderWrapper}>
            <View style={styles.sliderTrack}>
              <View 
                style={[
                  styles.sliderFill, 
                  { width: `${((radius - minRadius) / (maxRadius - minRadius)) * 100}%` }
                ]} 
              />
              <View 
                style={[
                  styles.sliderThumb, 
                  { left: `${((radius - minRadius) / (maxRadius - minRadius)) * 100}%` }
                ]} 
              />
            </View>
          </View>
          <Text style={styles.maxLabel}>{maxRadius}km</Text>
        </View>
      )}
      
      {!noLimitEnabled && (
        <View style={styles.presets}>
          {[5, 10, 25, 50, 100, 200].map((preset) => (
            <TouchableOpacity
              key={preset}
              onPress={() => onRadiusChange(preset)}
              style={[
                styles.presetButton,
                radius === preset ? styles.presetButtonActive : styles.presetButtonInactive
              ]}
            >
              <Text style={[
                styles.presetButtonText,
                radius === preset ? styles.presetButtonTextActive : styles.presetButtonTextInactive
              ]}>
                {preset}km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderWrapper: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  sliderTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    position: 'relative',
  },
  sliderFill: {
    height: 6,
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    top: -7,
    width: 20,
    height: 20,
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    marginLeft: -10,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  minLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  maxLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  presets: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  toggleButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  toggleButtonInactive: {
    backgroundColor: '#F3F4F6',
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  toggleButtonTextInactive: {
    color: '#6B7280',
  },
  presetButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  presetButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  presetButtonInactive: {
    backgroundColor: '#F3F4F6',
  },
  presetButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  presetButtonTextActive: {
    color: '#FFFFFF',
  },
  presetButtonTextInactive: {
    color: '#6B7280',
  },
});