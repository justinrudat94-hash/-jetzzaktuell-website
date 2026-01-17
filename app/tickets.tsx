import React, { useState, useEffect } from 'react';
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
  Wallet,
  TrendingUp,
  BarChart3,
  Ticket,
  Calendar,
  MapPin,
  Heart,
  ShoppingBag,
  Award,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants';
import { useAuth } from '@/utils/authContext';
import TicketWalletCard from '@/components/TicketWalletCard';
import TicketQRModal from '@/components/TicketQRModal';
import TicketStatCard from '@/components/TicketStatCard';
import SoldTicketsCard from '@/components/SoldTicketsCard';
import {
  getUserTickets,
  getUpcomingTickets,
  getPastTickets,
  getUserTicketStats,
  getEventTicketStats,
  getTotalTicketRevenue,
  TicketPurchase,
  UserTicketStats,
  formatPrice,
} from '@/services/ticketService';
import { supabase } from '@/lib/supabase';

type TabType = 'wallet' | 'sold' | 'stats';

export default function TicketsScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('wallet');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [upcomingTickets, setUpcomingTickets] = useState<TicketPurchase[]>([]);
  const [pastTickets, setPastTickets] = useState<TicketPurchase[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketPurchase | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  const [userEvents, setUserEvents] = useState<any[]>([]);
  const [eventStats, setEventStats] = useState<Map<string, any>>(new Map());
  const [totalRevenue, setTotalRevenue] = useState(0);

  const [ticketStats, setTicketStats] = useState<UserTicketStats>({
    totalEvents: 0,
    eventsThisYear: 0,
    eventsThisMonth: 0,
    favoriteCity: null,
    favoriteCategory: null,
    totalSpent: 0,
    averagePrice: 0,
    nextEvent: null,
  });

  const [showPastTickets, setShowPastTickets] = useState(false);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([loadWalletData(), loadSoldData(), loadStatsData()]);
    setLoading(false);
  };

  const loadWalletData = async () => {
    try {
      const [upcoming, past] = await Promise.all([getUpcomingTickets(), getPastTickets()]);
      setUpcomingTickets(upcoming);
      setPastTickets(past);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  const loadSoldData = async () => {
    try {
      if (!user) return;

      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .eq('tickets_required', true);

      if (events && events.length > 0) {
        setUserEvents(events);

        const statsMap = new Map();
        for (const event of events) {
          const stats = await getEventTicketStats(event.id);
          if (stats) {
            statsMap.set(event.id, stats);
          }
        }
        setEventStats(statsMap);

        const revenue = await getTotalTicketRevenue(user.id);
        setTotalRevenue(revenue);
      }
    } catch (error) {
      console.error('Error loading sold data:', error);
    }
  };

  const loadStatsData = async () => {
    try {
      const stats = await getUserTicketStats();
      setTicketStats(stats);
    } catch (error) {
      console.error('Error loading stats data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const handleTicketPress = (ticket: TicketPurchase) => {
    setSelectedTicket(ticket);
    setShowQRModal(true);
  };

  const renderWalletTab = () => {
    if (upcomingTickets.length === 0 && pastTickets.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Wallet size={64} color={Colors.gray400} />
          <Text style={styles.emptyStateTitle}>Noch keine Tickets</Text>
          <Text style={styles.emptyStateText}>
            Entdecke Events und kaufe dein erstes Ticket
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push('/(tabs)/explore')}
          >
            <Text style={styles.ctaButtonText}>Events entdecken</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View>
        {upcomingTickets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aktuelle Tickets</Text>
            <Text style={styles.sectionSubtitle}>
              {upcomingTickets.length} {upcomingTickets.length === 1 ? 'Ticket' : 'Tickets'}
            </Text>
            {upcomingTickets.map(ticket => (
              <TicketWalletCard
                key={ticket.id}
                ticket={ticket}
                onPress={() => handleTicketPress(ticket)}
              />
            ))}
          </View>
        )}

        {pastTickets.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => setShowPastTickets(!showPastTickets)}
            >
              <Text style={styles.sectionTitle}>Vergangene Tickets</Text>
              <Text style={styles.sectionSubtitle}>
                {pastTickets.length} {pastTickets.length === 1 ? 'Ticket' : 'Tickets'}
              </Text>
            </TouchableOpacity>

            {showPastTickets &&
              pastTickets.map(ticket => (
                <TicketWalletCard
                  key={ticket.id}
                  ticket={ticket}
                  onPress={() => handleTicketPress(ticket)}
                />
              ))}
          </View>
        )}
      </View>
    );
  };

  const renderSoldTab = () => {
    if (userEvents.length === 0) {
      return (
        <View style={styles.emptyState}>
          <ShoppingBag size={64} color={Colors.gray400} />
          <Text style={styles.emptyStateTitle}>Keine verkauften Tickets</Text>
          <Text style={styles.emptyStateText}>
            Erstelle ein Event und aktiviere den Ticketverkauf
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push('/(tabs)/create')}
          >
            <Text style={styles.ctaButtonText}>Event erstellen</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View>
        <View style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>Gesamtumsatz</Text>
          <Text style={styles.revenueValue}>{formatPrice(totalRevenue)}</Text>
          <Text style={styles.revenueSubtext}>
            Aus {userEvents.length} {userEvents.length === 1 ? 'Event' : 'Events'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deine Events mit Ticketverkauf</Text>
          {userEvents.map(event => {
            const stats = eventStats.get(event.id);
            return (
              <SoldTicketsCard
                key={event.id}
                event={event}
                soldTickets={stats?.soldTickets || 0}
                totalTickets={stats?.totalTickets || 0}
                revenue={stats?.revenue || 0}
                onPress={() => router.push(`/edit-event?id=${event.id}`)}
              />
            );
          })}
        </View>
      </View>
    );
  };

  const renderStatsTab = () => {
    if (ticketStats.totalEvents === 0) {
      return (
        <View style={styles.emptyState}>
          <BarChart3 size={64} color={Colors.gray400} />
          <Text style={styles.emptyStateTitle}>Noch keine Statistiken</Text>
          <Text style={styles.emptyStateText}>
            Kaufe dein erstes Ticket um Statistiken zu sehen
          </Text>
        </View>
      );
    }

    return (
      <View>
        <View style={styles.yearOverviewCard}>
          <Award size={48} color={Colors.primary} />
          <Text style={styles.yearOverviewTitle}>
            Du hast {ticketStats.eventsThisYear} Events besucht
          </Text>
          <Text style={styles.yearOverviewSubtitle}>in diesem Jahr</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deine Event-Statistiken</Text>

          <TicketStatCard
            title="Gesamt Events"
            value={ticketStats.totalEvents}
            icon={Calendar}
            color={Colors.primary}
            subtitle="Alle Zeit"
          />

          <TicketStatCard
            title="Events diesen Monat"
            value={ticketStats.eventsThisMonth}
            icon={Calendar}
            color={Colors.accent}
          />

          {ticketStats.favoriteCity && (
            <TicketStatCard
              title="Lieblingsstadt"
              value={ticketStats.favoriteCity}
              icon={MapPin}
              color={Colors.secondary}
            />
          )}

          {ticketStats.favoriteCategory && (
            <TicketStatCard
              title="Lieblingskategorie"
              value={ticketStats.favoriteCategory}
              icon={Heart}
              color={Colors.error}
            />
          )}

          <TicketStatCard
            title="Gesamtausgaben"
            value={formatPrice(ticketStats.totalSpent)}
            icon={Ticket}
            color={Colors.primary}
          />

          <TicketStatCard
            title="Durchschnittspreis"
            value={formatPrice(ticketStats.averagePrice)}
            icon={TrendingUp}
            color={Colors.accent}
            subtitle="Pro Ticket"
          />
        </View>

        {ticketStats.nextEvent && (
          <View style={styles.nextEventCard}>
            <Text style={styles.nextEventLabel}>Nächstes Event</Text>
            <Text style={styles.nextEventTitle}>{ticketStats.nextEvent.title}</Text>
            <Text style={styles.nextEventDate}>
              {new Date(ticketStats.nextEvent.start_date).toLocaleDateString('de-DE')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginPrompt}>
          <Ticket size={64} color={Colors.gray400} />
          <Text style={styles.loginPromptText}>Bitte melde dich an, um deine Tickets zu sehen</Text>
          <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/auth/login')}>
            <Text style={styles.ctaButtonText}>Anmelden</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meine Tickets</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'wallet' && styles.activeTab]}
          onPress={() => setActiveTab('wallet')}
        >
          <Wallet size={20} color={activeTab === 'wallet' ? Colors.primary : Colors.gray500} />
          <Text
            style={[styles.tabText, activeTab === 'wallet' && styles.activeTabText]}
          >
            Wallet
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'sold' && styles.activeTab]}
          onPress={() => setActiveTab('sold')}
        >
          <ShoppingBag size={20} color={activeTab === 'sold' ? Colors.primary : Colors.gray500} />
          <Text style={[styles.tabText, activeTab === 'sold' && styles.activeTabText]}>
            Verkauft
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <BarChart3 size={20} color={activeTab === 'stats' ? Colors.primary : Colors.gray500} />
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
            Statistiken
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Lade Tickets...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {activeTab === 'wallet' && renderWalletTab()}
          {activeTab === 'sold' && renderSoldTab()}
          {activeTab === 'stats' && renderStatsTab()}
        </ScrollView>
      )}

      {selectedTicket && (
        <TicketQRModal
          visible={showQRModal}
          ticket={selectedTicket}
          onClose={() => {
            setShowQRModal(false);
            setSelectedTicket(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.gray500,
  },
  activeTabText: {
    color: Colors.primary,
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
    color: Colors.gray600,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginBottom: Spacing.md,
  },
  collapsibleHeader: {
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.massive * 2,
  },
  emptyStateTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  ctaButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  ctaButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  revenueCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  revenueLabel: {
    fontSize: FontSizes.sm,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: Spacing.xs,
  },
  revenueValue: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  revenueSubtext: {
    fontSize: FontSizes.sm,
    color: Colors.white,
    opacity: 0.8,
  },
  yearOverviewCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    marginBottom: Spacing.xl,
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  yearOverviewTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  yearOverviewSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    marginTop: Spacing.xs,
  },
  nextEventCard: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  nextEventLabel: {
    fontSize: FontSizes.xs,
    color: Colors.white,
    opacity: 0.9,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  nextEventTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  nextEventDate: {
    fontSize: FontSizes.md,
    color: Colors.white,
    opacity: 0.95,
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loginPromptText: {
    fontSize: FontSizes.lg,
    color: Colors.gray700,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
});
