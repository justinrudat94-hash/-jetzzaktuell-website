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
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  AlertCircle,
  Clock,
  MessageCircle,
  Star,
  CheckCircle,
  Search,
  Filter,
  MoreVertical,
  Send,
  Bot,
  FileText,
  X,
  Check,
  User,
  AlertTriangle,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants';
import { supportService, TicketWithUser, TicketResponse, FolderStats } from '../../services/supportService';
import { useAuth } from '../../utils/authContext';

type FolderType = 'new' | 'waiting_admin' | 'waiting_user' | 'favorites' | 'closed';

export default function AdminSupportNew() {
  const { profile } = useAuth();

  const [currentFolder, setCurrentFolder] = useState<FolderType>('new');
  const [tickets, setTickets] = useState<TicketWithUser[]>([]);
  const [folderStats, setFolderStats] = useState<FolderStats>({
    new_count: 0,
    waiting_admin_count: 0,
    waiting_user_count: 0,
    favorites_count: 0,
    closed_today_count: 0,
    urgent_count: 0,
    overdue_count: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<TicketWithUser | null>(null);
  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [responseText, setResponseText] = useState('');
  const [sending, setSending] = useState(false);

  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingMessage, setClosingMessage] = useState('');

  const folders = [
    {
      id: 'new',
      name: 'Neue Anfragen',
      icon: AlertCircle,
      color: '#EF4444',
      count: folderStats.new_count,
    },
    {
      id: 'waiting_admin',
      name: 'Warte auf mich',
      icon: Clock,
      color: '#F59E0B',
      count: folderStats.waiting_admin_count,
    },
    {
      id: 'waiting_user',
      name: 'Warte auf User',
      icon: MessageCircle,
      color: '#3B82F6',
      count: folderStats.waiting_user_count,
    },
    {
      id: 'favorites',
      name: 'Favoriten',
      icon: Star,
      color: '#F59E0B',
      count: folderStats.favorites_count,
    },
    {
      id: 'closed',
      name: 'Geschlossen',
      icon: CheckCircle,
      color: '#10B981',
      count: folderStats.closed_today_count,
    },
  ];

  useEffect(() => {
    loadData();
    loadTemplates();
  }, [currentFolder]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ticketsData, statsData] = await Promise.all([
        supportService.getTicketsByFolder(currentFolder, profile?.id),
        supportService.getFolderStats(profile?.id),
      ]);

      setTickets(ticketsData);
      setFolderStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Fehler', 'Fehler beim Laden der Daten');
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

  const handleFolderChange = (folderId: FolderType) => {
    setCurrentFolder(folderId);
    setSelectedTicket(null);
  };

  const handleToggleFavorite = async (ticketId: string, e: any) => {
    e.stopPropagation();
    await supportService.toggleFavorite(ticketId);
    loadData();
  };

  const handleTicketPress = async (ticket: TicketWithUser) => {
    setSelectedTicket(ticket);
    await supportService.markTicketRead(ticket.id);
    const responsesData = await supportService.getTicketResponses(ticket.id);
    setResponses(responsesData);
  };

  const handleSendResponse = async () => {
    if (!selectedTicket || !responseText.trim()) return;

    let finalResponse = responseText.trim();
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
      Alert.alert('Erfolg', 'Antwort versendet und Email verschickt');
      loadData();
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
      Alert.alert(
        'Miley Vorschlag',
        `Miley hat eine Antwort generiert (Konfidenz: ${Math.round((result.confidence || 0) * 100)}%)`
      );
    } else {
      Alert.alert('Fehler', result.error || 'Fehler beim Generieren der Antwort');
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;

    let finalMessage = closingMessage.trim();
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

  const handleAssignToMe = async () => {
    if (!selectedTicket || !profile) return;

    const success = await supportService.assignTicket(selectedTicket.id, profile.id);
    if (success) {
      Alert.alert('Erfolg', 'Ticket dir zugewiesen');
      setSelectedTicket({ ...selectedTicket, assigned_to: profile.id, status: 'in_progress' });
      loadData();
    }
  };

  const renderFolderCard = (folder: any) => {
    const Icon = folder.icon;
    const isActive = currentFolder === folder.id;

    return (
      <TouchableOpacity
        key={folder.id}
        style={[styles.folderCard, isActive && styles.folderCardActive]}
        onPress={() => handleFolderChange(folder.id as FolderType)}
        activeOpacity={0.7}
      >
        <View style={[styles.folderIconContainer, { backgroundColor: folder.color + '20' }]}>
          <Icon size={28} color={folder.color} strokeWidth={2.5} />
        </View>
        <View style={styles.folderInfo}>
          <Text style={[styles.folderName, isActive && styles.folderNameActive]}>
            {folder.name}
          </Text>
        </View>
        <View style={[styles.folderBadge, { backgroundColor: folder.color }]}>
          <Text style={styles.folderBadgeText}>{folder.count}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTicketCard = (ticket: TicketWithUser) => {
    const priorityColor = supportService.getPriorityColor(ticket.priority);
    const isOverdue = supportService.isOverdue(ticket);
    const countdown = supportService.getAutoCloseCountdown(ticket.last_admin_response_at || null);
    const isClosed = ticket.status === 'closed' || ticket.status === 'resolved';

    return (
      <TouchableOpacity
        key={ticket.id}
        style={[
          styles.ticketCard,
          isOverdue && styles.ticketCardOverdue,
          isClosed && styles.ticketCardClosed
        ]}
        onPress={() => handleTicketPress(ticket)}
        activeOpacity={0.7}
      >
        <View style={styles.ticketHeader}>
          <View style={styles.ticketHeaderLeft}>
            {isClosed ? (
              <View style={styles.closedIndicator}>
                <CheckCircle size={18} color="#10B981" fill="#10B981" />
              </View>
            ) : (
              <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
            )}
            <Text style={[styles.ticketUser, isClosed && styles.ticketUserClosed]}>
              {ticket.user?.username || 'Unbekannt'}
            </Text>
            {isClosed && <Text style={styles.closedLabel}>Erledigt</Text>}
          </View>
          <TouchableOpacity onPress={(e) => handleToggleFavorite(ticket.id, e)} style={styles.favoriteButton}>
            <Star
              size={20}
              color={ticket.is_favorite ? '#F59E0B' : '#D1D5DB'}
              fill={ticket.is_favorite ? '#F59E0B' : 'none'}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.ticketSubject} numberOfLines={1}>
          {ticket.subject}
        </Text>
        <Text style={styles.ticketDescription} numberOfLines={2}>
          {ticket.description}
        </Text>

        <View style={styles.ticketFooter}>
          <View style={styles.ticketMeta}>
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
              <Text style={[styles.priorityText, { color: priorityColor }]}>
                {supportService.getPriorityLabel(ticket.priority)}
              </Text>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{supportService.getCategoryLabel(ticket.category)}</Text>
            </View>
          </View>

          {ticket.waiting_for === 'admin' && (
            <View style={[styles.waitingBadge, isOverdue && styles.waitingBadgeOverdue]}>
              <Clock size={12} color={isOverdue ? '#EF4444' : '#F59E0B'} />
              <Text style={[styles.waitingText, isOverdue && styles.waitingTextOverdue]}>
                {isOverdue ? 'Überfällig!' : 'Auf dich'}
              </Text>
            </View>
          )}

          {ticket.waiting_for === 'user' && countdown && (
            <View style={styles.countdownBadge}>
              <Text style={styles.countdownText}>Schließt {countdown}</Text>
            </View>
          )}
        </View>

        <Text style={styles.ticketTime}>{supportService.formatTimeAgo(ticket.created_at)}</Text>
      </TouchableOpacity>
    );
  };

  const renderTicketDetail = () => {
    if (!selectedTicket) return null;

    return (
      <Modal visible={true} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setSelectedTicket(null);
                setResponses([]);
                setResponseText('');
              }}
              style={styles.modalBackButton}
            >
              <ArrowLeft size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Ticket #{selectedTicket.id.slice(0, 8)}</Text>
            <TouchableOpacity onPress={(e) => handleToggleFavorite(selectedTicket.id, e)}>
              <Star
                size={24}
                color={selectedTicket.is_favorite ? '#F59E0B' : '#D1D5DB'}
                fill={selectedTicket.is_favorite ? '#F59E0B' : 'none'}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.ticketDetailCard}>
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
                  <Text
                    style={[styles.detailValue, { color: supportService.getPriorityColor(selectedTicket.priority) }]}
                  >
                    {supportService.getPriorityLabel(selectedTicket.priority)}
                  </Text>
                </View>
              </View>

              {selectedTicket.is_recurring && (
                <View style={styles.recurringBanner}>
                  <AlertTriangle size={20} color={Colors.error} />
                  <Text style={styles.recurringText}>
                    Wiederkehrendes Problem! {selectedTicket.related_issue_count} ähnliche Tickets
                  </Text>
                </View>
              )}

              <View style={styles.actionButtons}>
                {!selectedTicket.assigned_to && (
                  <TouchableOpacity style={styles.actionButton} onPress={handleAssignToMe}>
                    <User size={18} color={Colors.white} />
                    <Text style={styles.actionButtonText}>Zuweisen</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: Colors.success }]}
                  onPress={() => setShowCloseModal(true)}
                  disabled={selectedTicket.status === 'closed'}
                >
                  <CheckCircle size={18} color={Colors.white} />
                  <Text style={styles.actionButtonText}>Schließen</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.responsesSection}>
              <Text style={styles.responsesTitle}>Verlauf ({responses.length})</Text>
              {responses.map((response) => (
                <View
                  key={response.id}
                  style={[styles.responseCard, response.is_admin_response && styles.adminResponseCard]}
                >
                  <View style={styles.responseHeader}>
                    <Text style={styles.responseFrom}>
                      {response.is_admin_response ? 'Support-Team' : selectedTicket.user?.username}
                    </Text>
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
              <View style={styles.responseSection}>
                <View style={styles.responseHeader2}>
                  <Text style={styles.responseTitle}>Antworten</Text>
                  <View style={styles.responseActions}>
                    <TouchableOpacity style={styles.iconButton} onPress={() => setShowTemplates(true)}>
                      <FileText size={20} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={handleAskMiley} disabled={aiGenerating}>
                      {aiGenerating ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <Bot size={20} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
                <TextInput
                  style={styles.responseInput}
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
          </ScrollView>

          <Modal visible={showTemplates} transparent animationType="slide" onRequestClose={() => setShowTemplates(false)}>
            <View style={styles.templatesOverlay}>
              <View style={styles.templatesContent}>
                <View style={styles.templatesHeader}>
                  <Text style={styles.templatesTitle}>Antwort-Vorlagen</Text>
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

          <Modal visible={showCloseModal} transparent animationType="fade" onRequestClose={() => setShowCloseModal(false)}>
            <View style={styles.closeOverlay}>
              <View style={styles.closeContent}>
                <View style={styles.closeHeader}>
                  <Text style={styles.closeTitle}>Ticket schließen</Text>
                  <TouchableOpacity onPress={() => setShowCloseModal(false)}>
                    <X size={24} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.closeDescription}>
                  Schreibe eine kurze Abschlussnachricht (optional). Der Kunde erhält automatisch eine Email.
                </Text>
                <TextInput
                  style={styles.closeInput}
                  value={closingMessage}
                  onChangeText={setClosingMessage}
                  placeholder="z.B. Problem gelöst, lass uns wissen falls du noch Fragen hast!"
                  placeholderTextColor={Colors.gray500}
                  multiline
                  numberOfLines={3}
                />
                <TouchableOpacity style={styles.closeButton} onPress={handleCloseTicket}>
                  <Check size={20} color={Colors.white} />
                  <Text style={styles.closeButtonText}>Ticket schließen</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </Modal>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Support-Tickets</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Lade Tickets...</Text>
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

      <View style={styles.foldersContainer}>
        {folders.map(renderFolderCard)}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {tickets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CheckCircle size={64} color={Colors.gray400} />
            <Text style={styles.emptyTitle}>Keine Tickets</Text>
            <Text style={styles.emptyText}>Alle Tickets in diesem Ordner bearbeitet!</Text>
          </View>
        ) : (
          <View style={styles.ticketsList}>{tickets.map(renderTicketCard)}</View>
        )}
      </ScrollView>

      {renderTicketDetail()}
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
  foldersContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 2,
    borderBottomColor: Colors.gray200,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  folderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray50,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: Spacing.md,
    minHeight: 70,
  },
  folderCardActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  folderIconContainer: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
  },
  folderNameActive: {
    color: Colors.primary,
    fontWeight: FontWeights.bold,
  },
  folderBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderBadgeText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
  },
  ticketsList: {
    gap: Spacing.md,
  },
  ticketCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  ticketCardOverdue: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  ticketCardClosed: {
    borderColor: '#10B981',
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  ticketHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  closedIndicator: {
    marginRight: 2,
  },
  ticketUser: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.textSecondary,
  },
  ticketUserClosed: {
    color: '#059669',
    fontWeight: FontWeights.semibold,
  },
  closedLabel: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  favoriteButton: {
    padding: Spacing.xs,
  },
  ticketSubject: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  ticketDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  ticketMeta: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  priorityText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.gray100,
  },
  categoryText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    color: Colors.gray700,
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.warning + '20',
  },
  waitingBadgeOverdue: {
    backgroundColor: Colors.error + '20',
  },
  waitingText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.warning,
  },
  waitingTextOverdue: {
    color: Colors.error,
  },
  countdownBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.success + '20',
  },
  countdownText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    color: Colors.success,
  },
  ticketTime: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
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
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  modalBackButton: {
    padding: Spacing.xs,
  },
  modalHeaderTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  modalContent: {
    flex: 1,
  },
  ticketDetailCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
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
    backgroundColor: Colors.gray50,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
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
  recurringBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  recurringText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.error,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
  },
  actionButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  responsesSection: {
    padding: Spacing.md,
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
  adminResponseCard: {
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
  responseSection: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  responseHeader2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  responseTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
  },
  responseActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconButton: {
    padding: Spacing.xs,
  },
  responseInput: {
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
  templatesOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  templatesContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
  },
  templatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  templatesTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
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
  closeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  closeContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  closeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  closeTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  closeDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  closeInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: Spacing.md,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.success,
  },
  closeButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
});
