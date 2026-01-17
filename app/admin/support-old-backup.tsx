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
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Ticket,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  Send,
  AlertTriangle,
  Ban,
  Bot,
  FileText,
  X,
  Check,
} from 'lucide-react-native';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants';
import { supportService, TicketWithUser, TicketResponse, RecurringIssue } from '../../services/supportService';
import { useAuth } from '../../utils/authContext';
import { supabase } from '../../lib/supabase';

export default function AdminSupport() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tickets, setTickets] = useState<TicketWithUser[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithUser | null>(null);
  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [recurringIssues, setRecurringIssues] = useState<RecurringIssue[]>([]);
  const [responseText, setResponseText] = useState('');
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({
    total_open: 0,
    total_in_progress: 0,
    total_unassigned: 0,
    total_urgent: 0,
    recurring_issues: 0,
  });
  const [filter, setFilter] = useState<'all' | 'open' | 'urgent' | 'unassigned'>('all');

  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingMessage, setClosingMessage] = useState('');

  useEffect(() => {
    loadData();
    loadTemplates();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('Loading support data with filter:', filter);

      // Direct test query to debug RLS
      const { data: testData, error: testError } = await supabase
        .from('support_tickets')
        .select('id, subject, status')
        .limit(5);

      console.log('Direct query test - data:', testData);
      console.log('Direct query test - error:', testError);

      const filterOptions: any = {};
      if (filter === 'open') filterOptions.status = 'open';
      if (filter === 'urgent') filterOptions.priority = 'urgent';
      if (filter === 'unassigned') filterOptions.assigned = false;

      console.log('Filter options:', filterOptions);

      const [ticketsData, statsData, recurringData] = await Promise.all([
        supportService.getAllTickets(filterOptions),
        supportService.getDashboardStats(),
        supportService.getRecurringIssues(),
      ]);

      console.log('Tickets loaded:', ticketsData.length);
      console.log('Stats loaded:', statsData);

      setTickets(ticketsData);
      setStats(statsData);
      setRecurringIssues(recurringData);
    } catch (error) {
      console.error('Error loading support data:', error);
      Alert.alert('Fehler', 'Fehler beim Laden der Support-Daten: ' + (error as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTemplates = async () => {
    const templatesData = await supportService.getTemplates();
    setTemplates(templatesData);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const loadTicketDetails = async (ticket: TicketWithUser) => {
    setSelectedTicket(ticket);
    const responsesData = await supportService.getTicketResponses(ticket.id);
    setResponses(responsesData);
  };

  const handleSendResponse = async () => {
    if (!selectedTicket || !responseText.trim()) return;

    let finalResponse = responseText.trim();

    // Füge immer die professionelle Support-Signatur hinzu
    if (!finalResponse.includes('Dein Jetzz Support Team')) {
      finalResponse += '\n\nDein Jetzz Support Team';
    }

    setSending(true);
    const success = await supportService.addResponseWithEmail(selectedTicket.id, finalResponse, true);
    setSending(false);

    if (success) {
      setResponseText('');
      const responsesData = await supportService.getTicketResponses(selectedTicket.id);
      setResponses(responsesData);
      Alert.alert('Erfolg', 'Antwort versendet und Email an Kunde geschickt');
    } else {
      Alert.alert('Fehler', 'Fehler beim Senden der Antwort');
    }
  };

  const handleUseTemplate = async (template: any) => {
    setResponseText(template.template_text);
    setShowTemplates(false);
    await supportService.incrementTemplateUsage(template.id);
  };

  const handleAskMiley = async () => {
    if (!selectedTicket) return;

    setAiGenerating(true);
    const result = await supportService.generateAIResponse(selectedTicket.id);
    setAiGenerating(false);

    if (result.success && result.response) {
      setResponseText(result.response);
      Alert.alert('Miley Vorschlag', `Miley hat eine Antwort generiert (Konfidenz: ${Math.round((result.confidence || 0) * 100)}%)`);
    } else {
      Alert.alert('Fehler', result.error || 'Fehler beim Generieren der Antwort');
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;

    let finalMessage = closingMessage.trim();

    // Füge immer die professionelle Support-Signatur hinzu
    if (finalMessage && !finalMessage.includes('Dein Jetzz Support Team')) {
      finalMessage += '\n\nDein Jetzz Support Team';
    }

    const success = await supportService.closeTicket(selectedTicket.id, finalMessage || undefined);

    if (success) {
      Alert.alert('Erfolg', 'Ticket geschlossen und Bestätigungs-Email verschickt');
      setShowCloseModal(false);
      setClosingMessage('');
      setSelectedTicket(null);
      loadData();
    } else {
      Alert.alert('Fehler', 'Fehler beim Schließen des Tickets');
    }
  };

  const handleStatusChange = async (status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed') => {
    if (!selectedTicket) return;

    const success = await supportService.updateTicketStatus(selectedTicket.id, status);
    if (success) {
      Alert.alert('Erfolg', 'Status aktualisiert');
      setSelectedTicket({ ...selectedTicket, status });
      loadData();
    }
  };

  const handleAssignToMe = async () => {
    if (!selectedTicket || !profile) return;

    const success = await supportService.assignTicket(selectedTicket.id, profile.id);
    if (success) {
      Alert.alert('Erfolg', 'Ticket dir zugewiesen');
      setSelectedTicket({ ...selectedTicket, assigned_to: profile.id, status: 'in_progress' });
      loadData();
    }
  };

  const renderTicketCard = (ticket: TicketWithUser) => {
    const priorityColor = supportService.getPriorityColor(ticket.priority);
    const statusColor = supportService.getStatusColor(ticket.status);

    return (
      <TouchableOpacity
        key={ticket.id}
        style={styles.ticketCard}
        onPress={() => loadTicketDetails(ticket)}
      >
        <View style={styles.ticketHeader}>
          <View style={[styles.priorityIndicator, { backgroundColor: priorityColor }]} />
          <View style={styles.ticketInfo}>
            <Text style={styles.ticketSubject} numberOfLines={2}>{ticket.subject}</Text>
            <View style={styles.ticketMeta}>
              <User size={14} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{ticket.user?.username || 'Unknown'}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Clock size={14} color={Colors.textSecondary} />
              <Text style={styles.metaText}>
                {new Date(ticket.created_at).toLocaleDateString('de-DE')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.ticketBadges}>
          <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {supportService.getStatusLabel(ticket.status)}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: priorityColor + '20' }]}>
            <Text style={[styles.badgeText, { color: priorityColor }]}>
              {supportService.getPriorityLabel(ticket.priority)}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{supportService.getCategoryLabel(ticket.category)}</Text>
          </View>
          {ticket.is_recurring && (
            <View style={[styles.badge, { backgroundColor: Colors.errorLight }]}>
              <AlertTriangle size={12} color={Colors.error} />
              <Text style={[styles.badgeText, { color: Colors.error }]}>Wiederkehrend</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (selectedTicket) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              setSelectedTicket(null);
              setResponses([]);
              setResponseText('');
            }}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ticket #{selectedTicket.id.slice(0, 8)}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.ticketDetail}>
            <Text style={styles.detailSubject}>{selectedTicket.subject}</Text>
            <Text style={styles.detailDescription}>{selectedTicket.description}</Text>

            <View style={styles.detailMeta}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Von:</Text>
                <Text style={styles.detailValue}>{selectedTicket.user?.username}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.detailValue, { color: supportService.getStatusColor(selectedTicket.status) }]}>
                  {supportService.getStatusLabel(selectedTicket.status)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Priorität:</Text>
                <Text style={[styles.detailValue, { color: supportService.getPriorityColor(selectedTicket.priority) }]}>
                  {supportService.getPriorityLabel(selectedTicket.priority)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Kategorie:</Text>
                <Text style={styles.detailValue}>{supportService.getCategoryLabel(selectedTicket.category)}</Text>
              </View>
            </View>

            {selectedTicket.is_recurring && (
              <View style={styles.warningBanner}>
                <AlertTriangle size={20} color={Colors.error} />
                <Text style={styles.warningText}>
                  Wiederkehrendes Problem! {selectedTicket.related_issue_count} ähnliche Tickets in 7 Tagen.
                </Text>
              </View>
            )}

            <View style={styles.actionButtons}>
              {!selectedTicket.assigned_to && (
                <TouchableOpacity style={styles.actionBtn} onPress={handleAssignToMe}>
                  <User size={18} color={Colors.white} />
                  <Text style={styles.actionBtnText}>Zuweisen</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: Colors.success }]}
                onPress={() => setShowCloseModal(true)}
                disabled={selectedTicket.status === 'closed'}
              >
                <CheckCircle size={18} color={Colors.white} />
                <Text style={styles.actionBtnText}>Schließen</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.responsesSection}>
              <Text style={styles.responsesTitle}>Antworten ({responses.length})</Text>
              {responses.map(response => (
                <View
                  key={response.id}
                  style={[
                    styles.responseCard,
                    response.is_admin_response && styles.adminResponse,
                  ]}
                >
                  <View style={styles.responseHeader}>
                    {response.is_admin_response ? (
                      <Text style={styles.responseFrom}>Support-Team</Text>
                    ) : (
                      <Text style={styles.responseFrom}>{selectedTicket.user?.username}</Text>
                    )}
                    <Text style={styles.responseTime}>
                      {new Date(response.created_at).toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.responseMessage}>{response.message}</Text>
                </View>
              ))}
            </View>

            {selectedTicket.status !== 'closed' && (
              <View style={styles.replySection}>
                <View style={styles.replyHeader}>
                  <Text style={styles.replyTitle}>Antworten</Text>
                  <View style={styles.replyActions}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => setShowTemplates(true)}
                    >
                      <FileText size={20} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={handleAskMiley}
                      disabled={aiGenerating}
                    >
                      {aiGenerating ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <Bot size={20} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
                <TextInput
                  style={styles.replyInput}
                  value={responseText}
                  onChangeText={setResponseText}
                  placeholder="Deine Antwort..."
                  placeholderTextColor={Colors.gray500}
                  multiline
                  numberOfLines={4}
                />
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSendResponse}
                  disabled={sending || !responseText.trim()}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <Send size={20} color={Colors.white} />
                      <Text style={styles.sendButtonText}>Senden + Email</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        <Modal
          visible={showTemplates}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTemplates(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Antwort-Vorlagen</Text>
                <TouchableOpacity onPress={() => setShowTemplates(false)}>
                  <X size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.templatesList}>
                {templates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={styles.templateItem}
                    onPress={() => handleUseTemplate(template)}
                  >
                    <Text style={styles.templateName}>{template.template_name}</Text>
                    <Text style={styles.templateText} numberOfLines={2}>
                      {template.template_text}
                    </Text>
                    <Text style={styles.templateMeta}>
                      {template.usage_count}x verwendet • {template.category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showCloseModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCloseModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ticket schließen</Text>
                <TouchableOpacity onPress={() => setShowCloseModal(false)}>
                  <X size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalDescription}>
                Schreibe eine kurze Abschlussnachricht (optional). Der Kunde erhält automatisch eine Email mit der Zusammenfassung.
              </Text>
              <TextInput
                style={styles.modalInput}
                value={closingMessage}
                onChangeText={setClosingMessage}
                placeholder="z.B. Problem gelöst, lass uns wissen falls du noch Fragen hast!"
                placeholderTextColor={Colors.gray500}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleCloseTicket}
              >
                <Check size={20} color={Colors.white} />
                <Text style={styles.modalButtonText}>Ticket schließen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Lade Support-Tickets...</Text>
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
        <Text style={styles.headerTitle}>Support-Tickets</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <AlertCircle size={24} color={Colors.info} />
          <Text style={styles.statNumber}>{stats.total_open}</Text>
          <Text style={styles.statLabel}>Offen</Text>
        </View>
        <View style={styles.statCard}>
          <Clock size={24} color={Colors.warning} />
          <Text style={styles.statNumber}>{stats.total_in_progress}</Text>
          <Text style={styles.statLabel}>In Bearbeitung</Text>
        </View>
        <View style={styles.statCard}>
          <AlertTriangle size={24} color={Colors.error} />
          <Text style={styles.statNumber}>{stats.total_urgent}</Text>
          <Text style={styles.statLabel}>Dringend</Text>
        </View>
      </View>

      {recurringIssues.length > 0 && (
        <View style={styles.recurringBanner}>
          <AlertTriangle size={20} color={Colors.error} />
          <Text style={styles.recurringText}>
            {stats.recurring_issues} wiederkehrende Probleme erkannt!
          </Text>
        </View>
      )}

      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
            Alle
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'open' && styles.filterChipActive]}
          onPress={() => setFilter('open')}
        >
          <Text style={[styles.filterChipText, filter === 'open' && styles.filterChipTextActive]}>
            Offen
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'urgent' && styles.filterChipActive]}
          onPress={() => setFilter('urgent')}
        >
          <Text style={[styles.filterChipText, filter === 'urgent' && styles.filterChipTextActive]}>
            Dringend
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'unassigned' && styles.filterChipActive]}
          onPress={() => setFilter('unassigned')}
        >
          <Text style={[styles.filterChipText, filter === 'unassigned' && styles.filterChipTextActive]}>
            Nicht zugewiesen
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {tickets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ticket size={64} color={Colors.gray400} />
            <Text style={styles.emptyTitle}>Keine Tickets</Text>
            <Text style={styles.emptyText}>Alle Support-Anfragen bearbeitet!</Text>
          </View>
        ) : (
          <View style={styles.ticketsList}>
            {tickets.map(renderTicketCard)}
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
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
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
  statsContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  statNumber: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  recurringBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.errorLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.error,
  },
  recurringText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.error,
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
  content: {
    flex: 1,
  },
  ticketsList: {
    padding: Spacing.md,
  },
  ticketCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  ticketHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  priorityIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketSubject: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  metaDot: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginHorizontal: 2,
  },
  ticketBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.gray100,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    color: Colors.gray700,
  },
  ticketDetail: {
    padding: Spacing.md,
  },
  detailSubject: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  detailDescription: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  detailMeta: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  detailLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.error,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
  },
  actionBtnText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  responsesSection: {
    marginBottom: Spacing.md,
  },
  responsesTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  responseCard: {
    backgroundColor: Colors.gray50,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  adminResponse: {
    backgroundColor: Colors.primaryLight,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  responseFrom: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
  },
  responseTime: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  responseMessage: {
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  replySection: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  replyTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
  },
  replyActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconButton: {
    padding: Spacing.xs,
  },
  replyInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: Spacing.sm,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
  },
  sendButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  modalDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  templatesList: {
    padding: Spacing.md,
  },
  templateItem: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  templateName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  templateText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  templateMeta: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    margin: Spacing.md,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.success,
    margin: Spacing.md,
  },
  modalButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
});
