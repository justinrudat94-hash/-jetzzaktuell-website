import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, Animated } from 'react-native';
import { Heart } from 'lucide-react-native';
import { Colors } from '../constants';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';
import { toggleLike, isLiked, getLikeCount } from '../services/likeService';
import { useAuth } from '../utils/authContext';

interface LikeButtonProps {
  targetType: 'event' | 'user' | 'livestream';
  targetId: string;
  onLikeChange?: (liked: boolean, count: number) => void;
  showCount?: boolean;
  compact?: boolean;
}

export default function LikeButton({
  targetType,
  targetId,
  onLikeChange,
  showCount = true,
  compact = false,
}: LikeButtonProps) {
  const { user, isGuest } = useAuth();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLikeStatus();
    }, Math.random() * 500);

    return () => clearTimeout(timer);
  }, [targetId]);

  const loadLikeStatus = async () => {
    if (!user || isGuest) {
      setChecking(false);
      return;
    }

    setChecking(true);

    try {
      const [likedStatus, likeCount] = await Promise.all([
        isLiked(targetType, targetId),
        getLikeCount(targetType, targetId),
      ]);

      setLiked(likedStatus);
      setCount(likeCount);
    } catch (error) {
      console.error('Error checking like status:', error);
      setLiked(false);
      setCount(0);
    } finally {
      setChecking(false);
    }
  };

  const handlePress = async () => {
    if (isGuest || !user || loading) return;

    setLoading(true);

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    const { liked: newLikedStatus, error } = await toggleLike(targetType, targetId);

    if (!error) {
      const newCount = newLikedStatus ? count + 1 : Math.max(0, count - 1);
      setLiked(newLikedStatus);
      setCount(newCount);
      onLikeChange?.(newLikedStatus, newCount);
    }

    setLoading(false);
  };

  if (checking) {
    return (
      <View style={[styles.button, compact && styles.buttonCompact]}>
        <ActivityIndicator size="small" color={Colors.gray400} />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        liked && styles.buttonLiked,
        compact && styles.buttonCompact,
      ]}
      onPress={handlePress}
      disabled={loading || isGuest}
      activeOpacity={0.7}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Heart
          size={compact ? 26 : 20}
          color={liked ? Colors.error : '#000'}
          fill={liked ? Colors.error : 'transparent'}
          strokeWidth={2.5}
        />
      </Animated.View>
      {showCount && (
        <Text style={[styles.count, liked && styles.countLiked]}>
          {count > 0 ? count : ''}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    minWidth: 60,
    justifyContent: 'center',
  },
  buttonCompact: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    minWidth: 44,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.gray300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonLiked: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error,
  },
  count: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.gray600,
  },
  countLiked: {
    color: Colors.error,
  },
});
