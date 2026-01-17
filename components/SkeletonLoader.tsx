import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors } from '../constants/Colors';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonLoader({ width = '100%', height = 20, borderRadius = 4, style }: SkeletonLoaderProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function EventCardSkeleton() {
  return (
    <View style={styles.cardContainer}>
      <SkeletonLoader height={200} borderRadius={12} style={styles.image} />
      <View style={styles.content}>
        <SkeletonLoader width="70%" height={24} style={styles.title} />
        <SkeletonLoader width="50%" height={16} style={styles.date} />
        <SkeletonLoader width="60%" height={16} style={styles.location} />
        <View style={styles.footer}>
          <SkeletonLoader width={80} height={32} borderRadius={16} />
          <SkeletonLoader width={60} height={20} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.border,
  },
  cardContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  image: {
    marginBottom: 0,
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 8,
  },
  date: {
    marginBottom: 8,
  },
  location: {
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
