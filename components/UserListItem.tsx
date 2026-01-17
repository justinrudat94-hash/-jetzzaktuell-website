import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { User, MapPin } from 'lucide-react-native';
import { Colors } from '../constants';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';
import { FollowUser } from '../services/followService';
import FollowButton from './FollowButton';

interface UserListItemProps {
  user: FollowUser;
  onPress?: () => void;
  showFollowButton?: boolean;
}

export default function UserListItem({ user, onPress, showFollowButton = true }: UserListItemProps) {
  const currentYear = new Date().getFullYear();
  const age = currentYear - user.birth_year;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.content}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <View style={styles.avatar}>
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
          ) : (
            <User size={24} color={Colors.primary} />
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>{user.name}</Text>
          <View style={styles.meta}>
            <MapPin size={12} color={Colors.gray500} />
            <Text style={styles.metaText}>
              {user.city} • {age} Jahre
            </Text>
          </View>
        </View>

        {showFollowButton && (
          <FollowButton userId={user.id} compact />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray800,
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
  },
});
