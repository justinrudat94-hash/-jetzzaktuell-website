import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights } from '../constants';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      setIsOffline(!navigator.onLine);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <WifiOff size={16} color={Colors.white} />
      <Text style={styles.text}>
        Keine Internetverbindung
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#EF4444',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  text: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
});
