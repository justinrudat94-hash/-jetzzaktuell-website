import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { UserPlus, UserCheck } from 'lucide-react-native';
import { Colors } from '../constants';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';
import { followUser, unfollowUser, isFollowing } from '../services/followService';
import { useAuth } from '../utils/authContext';

interface FollowButtonProps {
  userId: string;
  onFollowChange?: (isFollowing: boolean) => void;
  compact?: boolean;
}

export default function FollowButton({ userId, onFollowChange, compact = false }: FollowButtonProps) {
  const { user, isGuest } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkFollowStatus();
  }, [userId]);

  const checkFollowStatus = async () => {
    if (!user || isGuest) {
      setChecking(false);
      return;
    }

    setChecking(true);
    const status = await isFollowing(userId);
    setFollowing(status);
    setChecking(false);
  };

  const handlePress = async () => {
    if (isGuest || !user) return;

    setLoading(true);

    if (following) {
      const { error } = await unfollowUser(userId);
      if (!error) {
        setFollowing(false);
        onFollowChange?.(false);
      }
    } else {
      const { error } = await followUser(userId);
      if (!error) {
        setFollowing(true);
        onFollowChange?.(true);
      }
    }

    setLoading(false);
  };

  if (isGuest || !user || user.id === userId) {
    return null;
  }

  if (checking) {
    return (
      <TouchableOpacity style={[styles.button, styles.buttonSecondary, compact && styles.buttonCompact]} disabled>
        <ActivityIndicator size="small" color={Colors.primary} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        following ? styles.buttonSecondary : styles.buttonPrimary,
        compact && styles.buttonCompact
      ]}
      onPress={handlePress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={following ? Colors.primary : Colors.white} />
      ) : (
        <>
          {following ? (
            <UserCheck size={compact ? 16 : 18} color={Colors.primary} />
          ) : (
            <UserPlus size={compact ? 16 : 18} color={Colors.white} />
          )}
          {!compact && (
            <Text style={[styles.buttonText, following && styles.buttonTextSecondary]}>
              {following ? 'Folge ich' : 'Folgen'}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    minWidth: 100,
  },
  buttonCompact: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minWidth: 40,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  buttonSecondary: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  buttonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  buttonTextSecondary: {
    color: Colors.primary,
  },
});
