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
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  Flag,
  BarChart3,
  Users,
  FileText,
  Settings,
  ChevronRight,
  Bell,
  Activity,
  TrendingUp,
  Eye,
  Clock,
  ShieldAlert,
  MessageSquare,
  Calendar,
  DollarSign,
  Download,
  Brain,
} from 'lucide-react-native';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants';
import { useAuth } from '../../utils/authContext';
import { dashboardService, DashboardStats, AdminAlert } from '../../services/dashboardService';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [criticalAlerts, setCriticalAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsData, alertsData] = await Promise.all([
        dashboardService.getDashboardStats(),
        dashboardService.getCriticalAlerts(),
      ]);

      setStats(statsData);
      setCriticalAlerts(alertsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const adminSections = [
    {
      title: 'Moderation',
      items: [
        {
          icon: Bell,
          label: 'Benachrichtigungen',
          description: 'Kritische Alerts & Warnungen',
          route: '/admin/alerts',
          badge: criticalAlerts.length > 0 ? criticalAlerts.length.toString() : undefined,
          color: Colors.error,
        },
        {
          icon: Shield,
          label: 'KI-Moderation',
          description: 'KI-Analysen & automatische Moderation',
          route: '/admin/ai-moderation',
          badge: 'KI',
          color: '#9333EA',
        },
        {
          icon: AlertTriangle,
          label: 'Moderations-Queue',
          description: 'KI-geflaggten Content überprüfen',
          route: '/admin/moderation',
          color: Colors.warning,
        },
        {
          icon: Flag,
          label: 'User-Reports',
          description: 'Gemeldete Inhalte bearbeiten',
          route: '/admin/reports',
          color: Colors.error,
        },
      ],
    },
    {
      title: 'Analytics',
      items: [
        {
          icon: ShieldAlert,
          label: 'Spam-Erkennung',
          description: 'Verdächtige User-Aktivitäten überwachen',
          route: '/admin/spam-detection',
          color: '#DC2626',
        },
        {
          icon: BarChart3,
          label: 'Statistiken',
          description: 'App-Nutzung & Performance',
          route: '/admin/analytics',
          color: Colors.info,
        },
        {
          icon: Users,
          label: 'Nutzer-Verwaltung',
          description: 'User-Liste & Sperren',
          route: '/admin/users',
          color: Colors.primary,
        },
      ],
    },
    {
      title: 'Verwaltung',
      items: [
        {
          icon: Activity,
          label: 'Event-Übersicht',
          description: 'Event-Statistiken nach Quelle',
          route: '/admin/events-overview',
          color: Colors.primary,
        },
        {
          icon: MessageSquare,
          label: 'Support-Tickets',
          description: 'User-Anfragen schnell bearbeiten',
          route: '/admin/support',
          color: '#2563EB',
        },
        {
          icon: Brain,
          label: 'KI Learning Queue',
          description: 'Feedback reviewen & Wissen freigeben',
          route: '/admin/ai-learning-queue',
          badge: 'KI',
          color: '#6366F1',
        },
        {
          icon: Download,
          label: 'Stadt-basierter Import',
          description: 'Events nach deutschen Städten importieren',
          route: '/admin/ticketmaster-city',
          badge: 'NEU',
          color: '#0066CC',
        },
        {
          icon: Download,
          label: 'Zeit-basierter Import',
          description: 'Events zeitbasiert importieren (experimentell)',
          route: '/admin/ticketmaster-simple',
          badge: 'ALT',
          color: '#6B7280',
        },
        {
          icon: DollarSign,
          label: 'Finanzen & Auszahlungen',
          description: 'Monetarisierung & Statistiken',
          route: '/admin/finances',
          color: '#F59E0B',
        },
        {
          icon: FileText,
          label: 'OSS-Umsatzsteuer',
          description: 'Quartalsberichte & EU-Meldungen',
          route: '/admin/oss-tax-reports',
          badge: 'NEU',
          color: '#EC4899',
        },
        {
          icon: TrendingUp,
          label: 'Revenue Dashboard',
          description: 'Ad-Performance & Premium-Statistiken',
          route: '/admin/revenue',
          color: '#10B981',
        },
        {
          icon: Users,
          label: 'Premium Subscriptions',
          description: 'Abonnenten-Tracking & Metriken',
          route: '/admin/premium-subscriptions',
          badge: 'NEU',
          color: '#8B5CF6',
        },
        {
          icon: Settings,
          label: 'System-Einstellungen',
          description: 'App-Konfiguration',
          route: '/admin/settings',
          color: Colors.textSecondary,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin-Dashboard</Text>
        <View style={styles.adminBadge}>
          <Shield size={16} color={Colors.white} />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Dashboard wird geladen...</Text>
          </View>
        ) : (
          <>
            <View style={styles.welcomeCard}>
              <View style={styles.welcomeIcon}>
                <Shield size={32} color={Colors.primary} />
              </View>
              <Text style={styles.welcomeTitle}>KI-gesteuertes Admin-Dashboard</Text>
              <Text style={styles.welcomeText}>
                Echtzeit-Überwachung mit künstlicher Intelligenz
              </Text>
              <View style={styles.lastUpdate}>
                <Clock size={14} color={Colors.textSecondary} />
                <Text style={styles.lastUpdateText}>
                  Zuletzt aktualisiert: {new Date().toLocaleTimeString('de-DE')}
                </Text>
              </View>
            </View>

            {criticalAlerts.length > 0 && (
              <View style={styles.criticalAlertsSection}>
                <View style={styles.alertsHeader}>
                  <Bell size={20} color={Colors.error} />
                  <Text style={styles.alertsHeaderTitle}>
                    Kritische Warnungen ({criticalAlerts.length})
                  </Text>
                </View>
                {criticalAlerts.map((alert) => (
                  <TouchableOpacity
                    key={alert.id}
                    style={styles.criticalAlertCard}
                    onPress={() => dashboardService.markAlertAsRead(alert.id)}
                  >
                    <View style={styles.alertIcon}>
                      <AlertTriangle size={20} color={Colors.error} />
                    </View>
                    <View style={styles.alertContent}>
                      <Text style={styles.alertTitle}>{alert.title}</Text>
                      <Text style={styles.alertMessage} numberOfLines={2}>
                        {alert.message}
                      </Text>
                      <Text style={styles.alertTime}>
                        {new Date(alert.created_at).toLocaleString('de-DE')}
                      </Text>
                    </View>
                    {alert.severity >= 4 && (
                      <View style={styles.highSeverityBadge}>
                        <Text style={styles.highSeverityText}>!</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {stats && (
              <View style={styles.metricsSection}>
                <Text style={styles.sectionTitle}>LIVE-METRIKEN</Text>
                <View style={styles.metricsGrid}>
                  <View style={[styles.metricCard, styles.metricCardCritical]}>
                    <AlertTriangle size={24} color={Colors.error} />
                    <Text style={styles.metricValue}>{stats.critical_alerts}</Text>
                    <Text style={styles.metricLabel}>Kritische Alerts</Text>
                  </View>
                  <View style={[styles.metricCard, styles.metricCardWarning]}>
                    <Flag size={24} color={Colors.warning} />
                    <Text style={styles.metricValue}>{stats.pending_reports}</Text>
                    <Text style={styles.metricLabel}>Offene Reports</Text>
                  </View>
                  <View style={[styles.metricCard, styles.metricCardInfo]}>
                    <Eye size={24} color={Colors.info} />
                    <Text style={styles.metricValue}>{stats.flagged_content}</Text>
                    <Text style={styles.metricLabel}>KI-geflaggter Content</Text>
                  </View>
                  <View style={[styles.metricCard, styles.metricCardDanger]}>
                    <Activity size={24} color={Colors.error} />
                    <Text style={styles.metricValue}>{stats.suspicious_activities}</Text>
                    <Text style={styles.metricLabel}>Verdächtige Aktivitäten</Text>
                  </View>
                  <View style={styles.metricCardWide}>
                    <Users size={24} color={Colors.primary} />
                    <Text style={styles.metricValue}>{stats.total_users}</Text>
                    <Text style={styles.metricLabel}>Registrierte Nutzer</Text>
                  </View>
                  <View style={styles.metricCardWide}>
                    <TrendingUp size={24} color={Colors.success} />
                    <Text style={styles.metricValue}>{stats.events_today}</Text>
                    <Text style={styles.metricLabel}>Events heute</Text>
                  </View>
                  <View style={styles.metricCardWide}>
                    <Activity size={24} color={Colors.error} />
                    <Text style={styles.metricValue}>{stats.active_livestreams}</Text>
                    <Text style={styles.metricLabel}>Aktive Livestreams</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {adminSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={styles.menuItem}
                  onPress={() => router.push(item.route as any)}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                    <item.icon size={24} color={item.color} />
                  </View>
                  <View style={styles.menuContent}>
                    <View style={styles.menuTitleRow}>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                      {item.badge && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{item.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.menuDescription}>{item.description}</Text>
                  </View>
                  <ChevronRight size={20} color={Colors.gray400} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📋 Admin-Aufgaben</Text>
          <Text style={styles.infoText}>
            • Überprüfe täglich die Moderations-Queue{'\n'}
            • Bearbeite User-Reports zeitnah{'\n'}
            • Kontrolliere Statistiken regelmäßig{'\n'}
            • Achte auf auffälliges Nutzerverhalten
          </Text>
        </View>
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
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.md,
  },
  adminBadge: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  welcomeCard: {
    backgroundColor: Colors.primaryLight,
    margin: Spacing.md,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  welcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  welcomeTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  welcomeText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    gap: 2,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  menuLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
  },
  badge: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  menuDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  infoBox: {
    backgroundColor: Colors.infoLight,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
  },
  infoTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    marginTop: 100,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  lastUpdate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  lastUpdateText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  criticalAlertsSection: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    marginTop: 0,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  alertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  alertsHeaderTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.error,
  },
  criticalAlertCard: {
    flexDirection: 'row',
    backgroundColor: Colors.errorLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  alertTime: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  highSeverityBadge: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  highSeverityText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  metricsSection: {
    marginTop: Spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  metricCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    width: '48%',
    alignItems: 'center',
    gap: Spacing.xs,
    borderLeftWidth: 3,
  },
  metricCardCritical: {
    borderLeftColor: Colors.error,
  },
  metricCardWarning: {
    borderLeftColor: Colors.warning,
  },
  metricCardInfo: {
    borderLeftColor: Colors.info,
  },
  metricCardDanger: {
    borderLeftColor: Colors.error,
  },
  metricCardWide: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    width: '31%',
    alignItems: 'center',
    gap: Spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  metricValue: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  metricLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
