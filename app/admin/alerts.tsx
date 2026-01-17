import React, { useState, useEffect } from 'react';
import { Colors } from '../../constants';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert as RNAlert,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  Eye,
  ShieldAlert,
  Clock,
  User,
  FileText,
} from 'lucide-react-native';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants';
import { dashboardService, AdminAlert } from '../../services/dashboardService';
import { useAuth } from '../../utils/authContext';

export default function AdminAlerts() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'critical' | 'action_required'>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadAlerts();
    loadUnreadCount();
  }, [selectedFilter]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getAllAlerts(selectedFilter, 100);
      setAlerts(data);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUnreadCount = async () => {
    const count = await dashboardService.getUnreadAlertCount();
    setUnreadCount(count);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAlerts();
    loadUnreadCount();
  };

  const handleMarkAsRead = async (alertId: string) => {
    const success = await dashboardService.markAlertAsRead(alertId);
    if (success) {
      loadAlerts();
      loadUnreadCount();
    }
  };

  const handleMarkAsActionTaken = async (alertId: string) => {
    const success = await dashboardService.markAlertAsActionTaken(alertId);
    if (success) {
      loadAlerts();
    }
  };

  const handleDismiss = async (alertId: string) => {
    RNAlert.alert(
      'Benachrichtigung verwerfen',
      'Möchtest du diese Benachrichtigung als gelesen und erledigt markieren?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Verwerfen',
          onPress: async () => {
            const success = await dashboardService.dismissAlert(alertId);
            if (success) {
              loadAlerts();
              loadUnreadCount();
            }
          },
        },
      ]
    );
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'critical':
        return ShieldAlert;
      case 'warning':
        return AlertTriangle;
      default:
        return Info;
    }
  };

  const getAlertColor = (alertType: string) => {
    switch (alertType) {
      case 'critical':
        return '#DC2626';
      case 'warning':
        return '#F97316';
      default:
        return '#2563EB';
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 5) return '#DC2626';
    if (severity >= 4) return '#EF4444';
    if (severity >= 3) return '#F97316';
    if (severity >= 2) return '#F59E0B';
    return '#10B981';
  };

  const getContentTypeIcon = (contentType?: string) => {
    switch (contentType) {
      case 'user':
        return User;
      case 'event':
        return FileText;
      case 'comment':
        return FileText;
      case 'livestream':
        return FileText;
      default:
        return Bell;
    }
  };

  const renderAlertCard = (alert: AdminAlert) => {
    const Icon = getAlertIcon(alert.alert_type);
    const ContentIcon = getContentTypeIcon(alert.related_content_type);
    const alertColor = getAlertColor(alert.alert_type);
    const severityColor = getSeverityColor(alert.severity);

    return (
      <View
        key={alert.id}
        style={[
          styles.alertCard,
          !alert.is_read && styles.alertCardUnread,
        ]}
      >
        <View style={styles.alertHeader}>
          <View style={[styles.alertIconContainer, { backgroundColor: alertColor + '20' }]}>
            <Icon size={24} color={alertColor} />
          </View>
          <View style={styles.alertHeaderInfo}>
            <Text style={styles.alertTitle}>{alert.title}</Text>
            <View style={styles.alertMeta}>
              <Clock size={14} color={Colors.textSecondary} />
              <Text style={styles.alertDate}>
                {new Date(alert.created_at).toLocaleString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
          <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
            <Text style={styles.severityText}>{alert.severity}</Text>
          </View>
        </View>

        <Text style={styles.alertMessage}>{alert.message}</Text>

        {alert.related_content_type && (
          <View style={styles.relatedContent}>
            <ContentIcon size={16} color={Colors.textSecondary} />
            <Text style={styles.relatedContentText}>
              {alert.related_content_type}: {alert.related_content_id?.slice(0, 8)}...
            </Text>
          </View>
        )}

        <View style={styles.alertActions}>
          {!alert.is_read && (
            <TouchableOpacity
              style={[styles.actionButton, styles.readButton]}
              onPress={() => handleMarkAsRead(alert.id)}
            >
              <Eye size={16} color={Colors.white} />
              <Text style={styles.actionButtonText}>Als gelesen</Text>
            </TouchableOpacity>
          )}

          {alert.action_required && !alert.action_taken && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionTakenButton]}
              onPress={() => handleMarkAsActionTaken(alert.id)}
            >
              <CheckCircle size={16} color={Colors.white} />
              <Text style={styles.actionButtonText}>Erledigt</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.dismissButton]}
            onPress={() => handleDismiss(alert.id)}
          >
            <X size={16} color={Colors.white} />
            <Text style={styles.actionButtonText}>Verwerfen</Text>
          </TouchableOpacity>
        </View>

        {alert.action_required && !alert.action_taken && (
          <View style={styles.actionRequiredBanner}>
            <AlertTriangle size={16} color={Colors.error} />
            <Text style={styles.actionRequiredText}>Aktion erforderlich</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Lade Benachrichtigungen...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Benachrichtigungen</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}>
            Alle
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'unread' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('unread')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'unread' && styles.filterChipTextActive]}>
            Ungelesen
          </Text>
          {unreadCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'critical' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('critical')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'critical' && styles.filterChipTextActive]}>
            Kritisch
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'action_required' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('action_required')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'action_required' && styles.filterChipTextActive]}>
            Aktion nötig
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {alerts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={64} color={Colors.gray400} />
            <Text style={styles.emptyTitle}>Keine Benachrichtigungen</Text>
            <Text style={styles.emptyText}>
              {selectedFilter === 'unread'
                ? 'Alle Benachrichtigungen gelesen'
                : selectedFilter === 'critical'
                ? 'Keine kritischen Benachrichtigungen'
                : selectedFilter === 'action_required'
                ? 'Keine Aktionen erforderlich'
                : 'Keine Benachrichtigungen vorhanden'}
            </Text>
          </View>
        ) : (
          <View style={styles.alertsList}>
            {alerts.map(renderAlertCard)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  unreadBadge: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  unreadBadgeText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.gray700,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  filterBadge: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },
  content: {
    flex: 1,
  },
  alertsList: {
    padding: Spacing.md,
  },
  alertCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  alertCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  alertIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  alertHeaderInfo: {
    flex: 1,
  },
  alertTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  alertMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  alertDate: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  severityBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  severityText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  alertMessage: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  relatedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  relatedContentText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  alertActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  readButton: {
    backgroundColor: Colors.info,
  },
  actionTakenButton: {
    backgroundColor: Colors.success,
  },
  dismissButton: {
    backgroundColor: Colors.gray500,
  },
  actionButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  actionRequiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.md,
  },
  actionRequiredText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.error,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    marginTop: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});
