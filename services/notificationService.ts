import { supabase } from '@/lib/supabase';

export interface InAppNotification {
  id: string;
  user_id: string;
  actor_id: string;
  notification_type: string;
  target_type: string;
  target_id: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
  actor?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

export interface NotificationPreferences {
  user_id: string;
  all_notifications_enabled: boolean;
  new_follower_enabled: boolean;
  event_comment_enabled: boolean;
  comment_reply_enabled: boolean;
  event_liked_enabled: boolean;
  event_updated_enabled: boolean;
  event_cancelled_enabled: boolean;
  event_live_enabled: boolean;
  payout_completed_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

export interface GroupedNotifications {
  today: InAppNotification[];
  yesterday: InAppNotification[];
  thisWeek: InAppNotification[];
  older: InAppNotification[];
}

export const notificationService = {
  async getNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: InAppNotification[] | null; error: any }> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error } = await supabase
      .from('in_app_notifications')
      .select(
        `
        *,
        actor:actor_id (
          id,
          username,
          avatar_url
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    return { data, error };
  },

  async getUnreadCount(userId: string): Promise<{ count: number; error: any }> {
    const { count, error } = await supabase
      .from('in_app_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return { count: count || 0, error };
  },

  async markAsRead(notificationId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('in_app_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    return { error };
  },

  async markAllAsRead(userId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('in_app_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return { error };
  },

  async deleteNotification(notificationId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('in_app_notifications')
      .delete()
      .eq('id', notificationId);

    return { error };
  },

  async deleteAllRead(userId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('in_app_notifications')
      .delete()
      .eq('user_id', userId)
      .eq('is_read', true);

    return { error };
  },

  async getPreferences(
    userId: string
  ): Promise<{ data: NotificationPreferences | null; error: any }> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    return { data, error };
  },

  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<{ error: any }> {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    return { error };
  },

  groupNotificationsByDate(
    notifications: InAppNotification[]
  ): GroupedNotifications {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const grouped: GroupedNotifications = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    notifications.forEach((notification) => {
      const createdAt = new Date(notification.created_at);

      if (createdAt >= todayStart) {
        grouped.today.push(notification);
      } else if (createdAt >= yesterdayStart) {
        grouped.yesterday.push(notification);
      } else if (createdAt >= weekStart) {
        grouped.thisWeek.push(notification);
      } else {
        grouped.older.push(notification);
      }
    });

    return grouped;
  },

  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Gerade eben';
    } else if (diffMins < 60) {
      return `vor ${diffMins} Min`;
    } else if (diffHours < 24) {
      return `vor ${diffHours} Std`;
    } else if (diffDays === 1) {
      return 'Gestern';
    } else if (diffDays < 7) {
      return `vor ${diffDays} Tagen`;
    } else {
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
  },

  groupSimilarNotifications(notifications: InAppNotification[]): InAppNotification[] {
    const grouped: Map<string, InAppNotification[]> = new Map();

    notifications.forEach((notification) => {
      const key = `${notification.notification_type}-${notification.target_id}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(notification);
    });

    const result: InAppNotification[] = [];

    grouped.forEach((group) => {
      if (group.length === 1) {
        result.push(group[0]);
      } else if (group.length >= 2 && group.length <= 3) {
        const first = group[0];
        const actorNames = group.map((n) => n.actor?.username || 'Jemand');
        first.message = `${actorNames.join(' und ')} ${
          first.notification_type === 'event_liked'
            ? 'haben dein Event geliked'
            : 'haben interagiert'
        }`;
        result.push(first);
      } else if (group.length >= 4) {
        const first = group[0];
        const firstName = first.actor?.username || 'Jemand';
        const othersCount = group.length - 1;
        first.message = `${firstName} und ${othersCount} andere ${
          first.notification_type === 'event_liked'
            ? 'haben dein Event geliked'
            : 'haben interagiert'
        }`;
        first.data = { ...first.data, count: group.length };
        result.push(first);
      }
    });

    return result.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },
};
