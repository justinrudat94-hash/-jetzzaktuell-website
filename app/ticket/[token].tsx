import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Linking,
  Animated,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Send, Clock, CheckCircle, AlertCircle, Headphones, Bot, Zap, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface TicketResponse {
  id: string;
  message: string;
  is_admin_response: boolean;
  created_at: string;
  user_id: string;
  ticket_id?: string;
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  closed_at: string | null;
  closing_message: string | null;
  user_id: string | null;
}

export default function PublicTicketPage() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showMileyBanner, setShowMileyBanner] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (token) {
      loadTicket();
    }
  }, [token]);

  useEffect(() => {
    if (ticket) {
      const cleanup = subscribeToResponses();
      return cleanup;
    }
  }, [ticket]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('access_token', token)
        .single();

      if (ticketError) throw ticketError;
      if (!ticketData) throw new Error('Ticket nicht gefunden');

      setTicket(ticketData);

      const { data: responsesData, error: responsesError } = await supabase
        .from('ticket_responses')
        .select('*')
        .eq('ticket_id', ticketData.id)
        .order('created_at', { ascending: true });

      if (responsesError) throw responsesError;
      setResponses(responsesData || []);
    } catch (err: any) {
      console.error('Error loading ticket:', err);
      setError(err.message || 'Fehler beim Laden des Tickets');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToResponses = () => {
    if (!token || !ticket) return;

    const channel = supabase
      .channel(`ticket_${token}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_responses',
          filter: `ticket_id=eq.${ticket.id}`,
        },
        (payload) => {
          const newResponse = payload.new as TicketResponse;
          setResponses((prev) => {
            // Avoid duplicates
            if (prev.some(r => r.id === newResponse.id)) {
              return prev;
            }
            return [...prev, newResponse];
          });
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTicket();
    setRefreshing(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticket || sending) return;

    const messageToSend = newMessage.trim();
    const tempId = `temp_${Date.now()}`;

    try {
      setSending(true);
      setError(null);

      // Optimistic update - add message immediately
      const optimisticMessage: TicketResponse = {
        id: tempId,
        message: messageToSend,
        is_admin_response: false,
        created_at: new Date().toISOString(),
        user_id: ticket.user_id || '',
        ticket_id: ticket.id,
      };

      setResponses((prev) => [...prev, optimisticMessage]);
      setNewMessage('');

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      const { data, error: insertError } = await supabase
        .from('ticket_responses')
        .insert({
          ticket_id: ticket.id,
          user_id: ticket.user_id,
          message: messageToSend,
          is_admin_response: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Replace optimistic message with real one
      if (data) {
        setResponses((prev) =>
          prev.map((msg) => (msg.id === tempId ? (data as TicketResponse) : msg))
        );
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError('Fehler beim Senden der Nachricht');

      // Remove optimistic message on error
      setResponses((prev) => prev.filter((msg) => msg.id !== tempId));
      setNewMessage(messageToSend);
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return '#3B82F6';
      case 'in_progress':
        return '#F59E0B';
      case 'resolved':
        return '#10B981';
      case 'closed':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: 'Offen',
      in_progress: 'In Bearbeitung',
      waiting: 'Wartet auf Antwort',
      resolved: 'Gelöst',
      closed: 'Geschlossen',
    };
    return labels[status] || status;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min`;
    if (diffHours < 24) return `vor ${diffHours} Std`;
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleCloseMileyBanner = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowMileyBanner(false));
  };

  const handleOpenMiley = () => {
    router.push('/profile/chat-support' as any);
  };

  const shouldShowMileyBanner = () => {
    if (!ticket || !showMileyBanner) return false;
    if (ticket.status === 'closed' || ticket.status === 'resolved') return false;

    const hasNoResponse = responses.filter(r => r.is_admin_response).length === 0;
    const ticketAge = Date.now() - new Date(ticket.created_at).getTime();
    const isOlderThan24Hours = ticketAge > 24 * 60 * 60 * 1000;

    return hasNoResponse && (responses.length === 0 || isOlderThan24Hours);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock size={14} color="#fff" />;
      case 'in_progress':
        return <Zap size={14} color="#fff" />;
      case 'resolved':
      case 'closed':
        return <CheckCircle size={14} color="#fff" />;
      default:
        return <AlertCircle size={14} color="#fff" />;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Ticket laden...' }} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Ticket wird geladen...</Text>
        </View>
      </View>
    );
  }

  if (error || !ticket) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Fehler' }} />
        <View style={styles.centerContent}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Ticket nicht gefunden</Text>
          <Text style={styles.errorText}>
            {error || 'Das Ticket konnte nicht geladen werden.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <Stack.Screen
        options={{
          title: `Ticket #${ticket.id.slice(0, 8)}`,
          headerStyle: { backgroundColor: '#4F46E5' },
          headerTintColor: '#fff',
        }}
      />

      <View style={styles.contentWrapper}>
        <View style={styles.ticketHeader}>
          <View style={styles.ticketHeaderTop}>
            <Text style={styles.ticketSubject}>{ticket.subject}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(ticket.status) },
              ]}
            >
              {getStatusIcon(ticket.status)}
              <Text style={styles.statusText}>{getStatusLabel(ticket.status)}</Text>
            </View>
          </View>
          <Text style={styles.ticketCategory}>{ticket.category}</Text>
          <View style={styles.ticketDateRow}>
            <Clock size={14} color="#6B7280" />
            <Text style={styles.ticketDate}>
              Erstellt am {new Date(ticket.created_at).toLocaleDateString('de-DE')}
            </Text>
          </View>
          <View style={styles.responseTimeIndicator}>
            <Text style={styles.responseTimeText}>
              Durchschnittliche Antwortzeit: 24-48 Stunden
            </Text>
          </View>
        </View>

        {ticket.status === 'closed' && ticket.closing_message && (
          <View style={styles.closedBanner}>
            <CheckCircle size={20} color="#10B981" />
            <View style={styles.closedBannerText}>
              <Text style={styles.closedTitle}>Ticket geschlossen</Text>
              <Text style={styles.closedMessage}>{ticket.closing_message}</Text>
            </View>
          </View>
        )}

        {shouldShowMileyBanner() && (
          <Animated.View style={[styles.mileyBanner, { opacity: fadeAnim }]}>
            <View style={styles.mileyBannerContent}>
              <View style={styles.mileyIconContainer}>
                <Bot size={24} color="#6366f1" />
              </View>
              <View style={styles.mileyBannerTextContainer}>
                <Text style={styles.mileyBannerTitle}>
                  Brauchst du schnelle Hilfe?
                </Text>
                <Text style={styles.mileyBannerText}>
                  Miley kann dir sofort weiterhelfen! Viele Fragen werden in Sekunden beantwortet.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.mileyBannerClose}
                onPress={handleCloseMileyBanner}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.mileyBannerButton} onPress={handleOpenMiley}>
              <Bot size={18} color="#fff" />
              <Text style={styles.mileyBannerButtonText}>Mit Miley chatten</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.messageItem}>
            <View style={styles.messageHeader}>
              <Text style={styles.messageSender}>Du</Text>
              <Text style={styles.messageTime}>
                {formatDate(ticket.created_at)}
              </Text>
            </View>
            <View style={[styles.messageBubble, styles.userBubble]}>
              <Text style={styles.messageText}>{ticket.description}</Text>
            </View>
          </View>

          {responses.map((response) => (
            <View key={response.id} style={styles.messageItem}>
              <View style={styles.messageHeader}>
                <View style={styles.messageSenderRow}>
                  {response.is_admin_response && (
                    <View style={styles.supportIcon}>
                      <Headphones size={14} color="#4F46E5" />
                    </View>
                  )}
                  <Text style={styles.messageSender}>
                    {response.is_admin_response ? 'Support-Team' : 'Du'}
                  </Text>
                </View>
                <Text style={styles.messageTime}>
                  {formatDate(response.created_at)}
                </Text>
              </View>
              <View
                style={[
                  styles.messageBubble,
                  response.is_admin_response
                    ? styles.adminBubble
                    : styles.userBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    response.is_admin_response && styles.adminMessageText,
                  ]}
                >
                  {response.message}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {ticket.status !== 'closed' && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Deine Nachricht..."
              placeholderTextColor="#9CA3AF"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={2000}
              editable={!sending}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        )}

        {ticket.status === 'closed' && (
          <View style={styles.closedFooter}>
            <Text style={styles.closedFooterText}>
              Dieses Ticket wurde geschlossen. Falls du weitere Fragen hast, erstelle
              bitte ein neues Ticket.
            </Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  contentWrapper: {
    flex: 1,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  ticketHeader: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  ticketHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ticketSubject: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginRight: 12,
    lineHeight: 28,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  ticketCategory: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  ticketDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  ticketDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  responseTimeIndicator: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  responseTimeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  closedBanner: {
    flexDirection: 'row',
    backgroundColor: '#D1FAE5',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  closedBannerText: {
    flex: 1,
    marginLeft: 12,
  },
  closedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 4,
  },
  closedMessage: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  mileyBanner: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#C7D2FE',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  mileyBannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mileyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mileyBannerTextContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  mileyBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4338CA',
    marginBottom: 4,
  },
  mileyBannerText: {
    fontSize: 14,
    color: '#4F46E5',
    lineHeight: 20,
  },
  mileyBannerClose: {
    padding: 4,
  },
  mileyBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mileyBannerButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  messagesContent: {
    padding: 20,
  },
  messageItem: {
    marginBottom: 20,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  messageSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  supportIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageSender: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  messageTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  messageBubble: {
    padding: 16,
    borderRadius: 16,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: '#EEF2FF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  adminBubble: {
    backgroundColor: '#4F46E5',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
  },
  adminMessageText: {
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    maxHeight: 120,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0.1,
  },
  closedFooter: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  closedFooterText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 20,
  },
});
