import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './authContext';
import {
  notificationService,
  InAppNotification,
  NotificationPreferences,
} from '@/services/notificationService';
import { useToast } from './toastContext';

interface NotificationContextType {
  notifications: InAppNotification[];
  unreadCount: number;
  loading: boolean;
  preferences: NotificationPreferences | null;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const POLL_INTERVAL = 30000;
const NOTIFICATIONS_PER_PAGE = 20;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) return;

    const { count, error } = await notificationService.getUnreadCount(user.id);
    if (!error) {
      setUnreadCount(count);
    }
  }, [user?.id]);

  const fetchNotifications = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (!user?.id) return;

      setLoading(true);
      const { data, error } = await notificationService.getNotifications(
        user.id,
        pageNum,
        NOTIFICATIONS_PER_PAGE
      );

      if (!error && data) {
        if (append) {
          setNotifications((prev) => [...prev, ...data]);
        } else {
          setNotifications(data);

          if (data.length > 0 && lastNotificationId && data[0].id !== lastNotificationId) {
            showToast('Neue Benachrichtigung erhalten', 'info');
          }

          if (data.length > 0) {
            setLastNotificationId(data[0].id);
          }
        }

        setHasMore(data.length === NOTIFICATIONS_PER_PAGE);
      }

      setLoading(false);
    },
    [user?.id, lastNotificationId, showToast]
  );

  const fetchPreferences = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await notificationService.getPreferences(user.id);
    if (!error && data) {
      setPreferences(data);
    }
  }, [user?.id]);

  const refreshNotifications = useCallback(async () => {
    setPage(1);
    await Promise.all([
      fetchNotifications(1, false),
      fetchUnreadCount(),
      fetchPreferences(),
    ]);
  }, [fetchNotifications, fetchUnreadCount, fetchPreferences]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchNotifications(nextPage, true);
  }, [hasMore, loading, page, fetchNotifications]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      const { error } = await notificationService.markAsRead(notificationId);
      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    const { error } = await notificationService.markAllAsRead(user.id);
    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      showToast('Alle als gelesen markiert', 'success');
    }
  }, [user?.id, showToast]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      const notification = notifications.find((n) => n.id === notificationId);
      const { error } = await notificationService.deleteNotification(notificationId);
      if (!error) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        if (notification && !notification.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        showToast('Benachrichtigung gelöscht', 'success');
      }
    },
    [notifications, showToast]
  );

  const updatePreferences = useCallback(
    async (prefs: Partial<NotificationPreferences>) => {
      if (!user?.id) return;

      const { error } = await notificationService.updatePreferences(user.id, prefs);
      if (!error) {
        setPreferences((prev) => (prev ? { ...prev, ...prefs } : null));
        showToast('Einstellungen gespeichert', 'success');
      } else {
        showToast('Fehler beim Speichern', 'error');
      }
    },
    [user?.id, showToast]
  );

  useEffect(() => {
    if (user?.id) {
      refreshNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setPreferences(null);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const intervalId = setInterval(() => {
      fetchUnreadCount();
      if (page === 1) {
        fetchNotifications(1, false);
      }
    }, POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [user?.id, page, fetchUnreadCount, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        preferences,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        updatePreferences,
        loadMore,
        hasMore,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
