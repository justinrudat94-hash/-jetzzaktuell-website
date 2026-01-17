import {
  UserPlus,
  Heart,
  MessageCircle,
  MessageSquare,
  Bell,
  XCircle,
  Video,
  Coins,
} from 'lucide-react-native';

export const NOTIFICATION_ICONS = {
  new_follower: UserPlus,
  event_liked: Heart,
  event_comment: MessageCircle,
  comment_reply: MessageSquare,
  event_updated: Bell,
  event_cancelled: XCircle,
  event_live: Video,
  payout_completed: Coins,
};

export const NOTIFICATION_COLORS = {
  new_follower: '#3B82F6',
  event_liked: '#EF4444',
  event_comment: '#8B5CF6',
  comment_reply: '#8B5CF6',
  event_updated: '#F59E0B',
  event_cancelled: '#DC2626',
  event_live: '#10B981',
  payout_completed: '#F59E0B',
};

export interface NotificationTemplate {
  title: string;
  message: string;
  icon: any;
  color: string;
}

export const getNotificationIcon = (type: string) => {
  return NOTIFICATION_ICONS[type as keyof typeof NOTIFICATION_ICONS] || Bell;
};

export const getNotificationColor = (type: string) => {
  return NOTIFICATION_COLORS[type as keyof typeof NOTIFICATION_COLORS] || '#6B7280';
};

export const getNotificationRoute = (
  notificationType: string,
  targetType: string,
  targetId: string,
  data?: any
): string => {
  switch (notificationType) {
    case 'new_follower':
      return `/profile/${targetId}`;

    case 'event_liked':
    case 'event_comment':
    case 'event_updated':
    case 'event_cancelled':
      return `/events/${targetId}`;

    case 'comment_reply':
      return `/events/${data?.event_id || targetId}`;

    case 'event_live':
      return `/live?eventId=${targetId}`;

    case 'payout_completed':
      return '/profile/payouts';

    default:
      return '/notifications';
  }
};

export const NOTIFICATION_PRIORITY = {
  new_follower: 'normal',
  event_liked: 'low',
  event_comment: 'normal',
  comment_reply: 'normal',
  event_updated: 'normal',
  event_cancelled: 'high',
  event_live: 'high',
  payout_completed: 'normal',
};
