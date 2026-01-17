import React, { useEffect } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useNotifications } from '@/utils/notificationContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export default function NotificationBell() {
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (unreadCount > 0) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 150 }),
          withTiming(1, { duration: 150 })
        ),
        2,
        false
      );
    }
  }, [unreadCount]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    router.push('/notifications' as any);
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <Animated.View style={animatedStyle}>
        <Bell size={24} color="#000" strokeWidth={2} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
