import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useNotifications } from '../utils/notificationContext';
import { notificationService, InAppNotification } from '../services/notificationService';
import {
  getNotificationIcon,
  getNotificationColor,
  getNotificationRoute,
} from '../utils/notificationTemplates';
import { MoreVertical, Trash2 } from 'lucide-react-native';

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
    hasMore,
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: InAppNotification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    const route = getNotificationRoute(
      notification.notification_type,
      notification.target_type,
      notification.target_id,
      notification.data
    );

    router.push(route as any);
  };

  const handleDelete = (notificationId: string) => {
    Alert.alert('Benachrichtigung löschen', 'Möchtest du diese Benachrichtigung löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => deleteNotification(notificationId),
      },
    ]);
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0) return;
    markAllAsRead();
  };

  const renderNotificationItem = ({ item }: { item: InAppNotification }) => {
    const Icon = getNotificationIcon(item.notification_type);
    const color = getNotificationColor(item.notification_type);
    const relativeTime = notificationService.getRelativeTime(item.created_at);

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.is_read && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          {item.actor?.avatar_url ? (
            <Image source={{ uri: item.actor.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
              <Icon size={20} color={color} strokeWidth={2} />
            </View>
          )}

          <View style={styles.textContainer}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.message} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={styles.time}>{relativeTime}</Text>
          </View>

          {!item.is_read && <View style={styles.unreadDot} />}
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 size={18} color="#9CA3AF" strokeWidth={2} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const groupedNotifications = notificationService.groupNotificationsByDate(notifications);

  const sections = [
    { title: 'Heute', data: groupedNotifications.today },
    { title: 'Gestern', data: groupedNotifications.yesterday },
    { title: 'Diese Woche', data: groupedNotifications.thisWeek },
    { title: 'Älter', data: groupedNotifications.older },
  ].filter((section) => section.data.length > 0);

  const flattenedData = sections.flatMap((section) => [
    { type: 'header', title: section.title },
    ...section.data.map((item) => ({ type: 'item', data: item })),
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Benachrichtigungen</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Alle als gelesen</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={flattenedData}
        keyExtractor={(item, index) =>
          item.type === 'header' ? `header-${index}` : `item-${item.data.id}`
        }
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return renderSectionHeader(item.title);
          }
          return renderNotificationItem({ item: item.data });
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={() => {
          if (hasMore && !loading) {
            loadMore();
          }
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Keine Benachrichtigungen</Text>
          </View>
        }
        contentContainerStyle={flattenedData.length === 0 && styles.emptyList}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  unreadItem: {
    backgroundColor: '#EFF6FF',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  emptyList: {
    flexGrow: 1,
  },
});
