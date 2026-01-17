import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Modal,
} from 'react-native';
import { ArrowLeft, FileText, Clock, CheckCircle, AlertCircle, MessageCircle, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSizes, FontWeights } from '../../constants';
import { supportService, SupportTicket } from '../../services/supportService';
import { useAuth } from '../../utils/authContext';
import { useToast } from '../../utils/toastContext';
import { supabase } from '../../lib/supabase';

export default function MyTicketsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [closingTicketId, setClosingTicketId] = useState<string | null>(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    if (!user) return;

    try {
      const data = await supportService.getUserTickets();
      const openTickets = data.filter(ticket => ticket.status !== 'closed' && ticket.status !== 'resolved');
      setTickets(openTickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTickets();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock size={20} color={Colors.blue500} />;
      case 'in_progress':
        return <MessageCircle size={20} color={Colors.orange500} />;
      case 'waiting':
        return <AlertCircle size={20} color={Colors.gray500} />;
      case 'resolved':
      case 'closed':
        return <CheckCircle size={20} color={Colors.green500} />;
      default:
        return <FileText size={20} color={Colors.gray500} />;
    }
  };

  const getStatusColor = (status: string) => {
    return supportService.getStatusColor(status);
  };

  const getPriorityColor = (priority: string) => {
    return supportService.getPriorityColor(priority);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `vor ${diffMins} Min`;
    } else if (diffHours < 24) {
      return `vor ${diffHours} Std`;
    } else if (diffDays < 7) {
      return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    } else {
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  };

  const handleCloseTicket = (ticketId: string) => {
    setClosingTicketId(ticketId);
    setShowCloseDialog(true);
  };

  const confirmCloseTicket = async () => {
    if (!closingTicketId) return;

    try {
      const success = await supportService.closeTicket(closingTicketId, 'Ticket wurde vom Nutzer selbst geschlossen');
      if (success) {
        showToast('Ticket erfolgreich geschlossen', 'success');
        loadTickets();
      } else {
        showToast('Fehler beim Schließen des Tickets', 'error');
      }
    } catch (error) {
      console.error('Error closing ticket:', error);
      showToast('Fehler beim Schließen des Tickets', 'error');
    } finally {
      setShowCloseDialog(false);
      setClosingTicketId(null);
    }
  };

  const canCloseTicket = (status: string) => {
    return status !== 'closed' && status !== 'resolved';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.gray800} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meine Tickets</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meine Tickets</Text>
        <TouchableOpacity
          onPress={() => router.push('/profile/create-ticket')}
          style={styles.createButton}
        >
          <Text style={styles.createButtonText}>+ Neu</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {tickets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FileText size={64} color={Colors.gray400} />
            <Text style={styles.emptyTitle}>Keine Tickets vorhanden</Text>
            <Text style={styles.emptyText}>
              Du hast noch keine Support-Anfragen erstellt.
            </Text>
            <TouchableOpacity
              style={styles.createTicketButton}
              onPress={() => router.push('/profile/create-ticket')}
            >
              <Text style={styles.createTicketButtonText}>Ticket erstellen</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ticketsContainer}>
            <Text style={styles.sectionTitle}>
              {tickets.length} {tickets.length === 1 ? 'Ticket' : 'Tickets'}
            </Text>
            {tickets.map((ticket) => (
              <View key={ticket.id} style={styles.ticketCard}>
                <TouchableOpacity
                  onPress={async () => {
                    // Navigate to ticket detail page using access_token
                    const { data } = await supabase
                      .from('support_tickets')
                      .select('access_token')
                      .eq('id', ticket.id)
                      .single();

                    if (data?.access_token) {
                      router.push(`/ticket/${data.access_token}` as any);
                    } else {
                      showToast('Ticket-Token nicht gefunden', 'error');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.ticketHeader}>
                    <View style={styles.ticketHeaderLeft}>
                      {getStatusIcon(ticket.status)}
                      <Text style={styles.ticketId}>#{ticket.id.slice(0, 8)}</Text>
                    </View>
                    <View style={styles.ticketHeaderRight}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
                          {supportService.getStatusLabel(ticket.status)}
                        </Text>
                      </View>
                      {canCloseTicket(ticket.status) && (
                        <TouchableOpacity
                          style={styles.closeButton}
                          onPress={() => handleCloseTicket(ticket.id)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <X size={18} color={Colors.gray600} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                <Text style={styles.ticketSubject} numberOfLines={1}>
                  {ticket.subject}
                </Text>
                <Text style={styles.ticketDescription} numberOfLines={2}>
                  {ticket.description}
                </Text>

                  <View style={styles.ticketFooter}>
                    <View style={styles.ticketMetadata}>
                      <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(ticket.priority) + '20' }]}>
                        <Text style={[styles.priorityText, { color: getPriorityColor(ticket.priority) }]}>
                          {supportService.getPriorityLabel(ticket.priority)}
                        </Text>
                      </View>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>
                          {supportService.getCategoryLabel(ticket.category)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.ticketDate}>{formatDate(ticket.created_at)}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showCloseDialog}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowCloseDialog(false);
          setClosingTicketId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ticket schließen</Text>
            <Text style={styles.modalMessage}>
              Möchtest du dieses Ticket wirklich schließen? Das Ticket wird dann aus deiner Liste entfernt.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowCloseDialog(false);
                  setClosingTicketId(null);
                }}
              >
                <Text style={styles.modalCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmCloseTicket}
              >
                <Text style={styles.modalConfirmText}>Schließen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
  },
  createButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  placeholder: {
    width: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  createTicketButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  createTicketButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  ticketsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  ticketCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  ticketHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ticketId: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.gray600,
    marginLeft: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
  ticketSubject: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  ticketDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.gray100,
  },
  categoryText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    color: Colors.gray700,
  },
  ticketDate: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  closeButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: Colors.gray100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  modalMessage: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: Colors.gray200,
  },
  modalCancelText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
  },
  modalConfirmButton: {
    backgroundColor: Colors.error,
  },
  modalConfirmText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
});
