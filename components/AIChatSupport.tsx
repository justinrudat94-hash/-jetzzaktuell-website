import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Pressable, Modal } from 'react-native';
import { MessageCircle, Send, ThumbsUp, ThumbsDown, AlertCircle, Check, RefreshCw, X, ArrowLeft } from 'lucide-react-native';
import { chatService, ChatMessage as ChatMessageType, ChatConversation } from '@/services/chatService';
import { useToast } from '@/utils/toastContext';
import { useRouter } from 'expo-router';

interface AIChatSupportProps {
  onClose?: () => void;
  hideHeader?: boolean;
}

interface FeedbackModalData {
  messageId: string;
  originalQuestion: string;
  originalAnswer: string;
}

export function AIChatSupport({ onClose, hideHeader = false }: AIChatSupportProps) {
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackModalData, setFeedbackModalData] = useState<FeedbackModalData | null>(null);
  const [feedbackType, setFeedbackType] = useState<'incorrect' | 'incomplete' | 'unclear' | 'outdated' | 'other'>('other');
  const [feedbackText, setFeedbackText] = useState('');
  const [isGeneratingImproved, setIsGeneratingImproved] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const initializeChat = async () => {
    try {
      setIsLoading(true);
      const conv = await chatService.getOrCreateActiveConversation();
      setConversation(conv);
      const msgs = await chatService.getConversationMessages(conv.id);
      setMessages(msgs);
    } catch (error) {
      showToast('Fehler beim Laden des Chats', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !conversation) return;

    const userMessage = inputText.trim();
    setInputText('');
    setIsTyping(true);

    try {
      const { userMessage: newUserMsg, aiMessage } = await chatService.sendUserMessage(
        conversation.id,
        userMessage
      );

      setMessages(prev => [...prev, newUserMsg, aiMessage]);

      if (aiMessage.ai_confidence_score && aiMessage.ai_confidence_score < 0.6) {
        setTimeout(() => {
          setShowRating(false);
        }, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setInputText(userMessage);
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Senden der Nachricht';
      showToast(errorMessage, 'error');
    } finally {
      setIsTyping(false);
    }
  };

  const markMessageHelpful = async (messageId: string, wasHelpful: boolean) => {
    try {
      const message = await chatService.markMessageHelpful(messageId, wasHelpful);

      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, was_helpful: wasHelpful } : msg
        )
      );

      if (!wasHelpful) {
        const userQuestion = messages
          .filter(m => m.sender_type === 'user')
          .slice(-1)[0]?.message || 'Frage';

        setFeedbackModalData({
          messageId,
          originalQuestion: userQuestion,
          originalAnswer: message.message,
        });
        setShowFeedbackModal(true);
      } else {
        showToast('Danke für dein Feedback!', 'success');
      }
    } catch (error) {
      showToast('Fehler beim Speichern des Feedbacks', 'error');
    }
  };

  const submitDetailedFeedback = async () => {
    if (!feedbackModalData) return;

    try {
      setIsGeneratingImproved(true);

      const feedbackId = await chatService.handleNegativeFeedback(
        feedbackModalData.messageId,
        feedbackType,
        feedbackText
      );

      const improvedMessage = await chatService.generateImprovedResponse(
        feedbackId,
        feedbackModalData.originalQuestion,
        feedbackText || feedbackType
      );

      setMessages(prev => [...prev, improvedMessage]);

      showToast('Verbesserte Antwort generiert!', 'success');

      setShowFeedbackModal(false);
      setFeedbackModalData(null);
      setFeedbackText('');
      setFeedbackType('other');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showToast('Fehler beim Generieren der verbesserten Antwort', 'error');
    } finally {
      setIsGeneratingImproved(false);
    }
  };

  const skipDetailedFeedback = () => {
    showToast('Danke für dein Feedback!', 'success');
    setShowFeedbackModal(false);
    setFeedbackModalData(null);
    setFeedbackText('');
    setFeedbackType('other');
  };

  const escalateToTicket = async () => {
    if (!conversation) return;

    try {
      setIsLoading(true);
      const ticket = await chatService.escalateToTicket(conversation.id);
      showToast('Ticket erstellt! Du wirst weitergeleitet...', 'success');

      setTimeout(() => {
        router.push(`/app/profile/support?ticket=${ticket.id}`);
        onClose?.();
      }, 1500);
    } catch (error) {
      console.error('Error escalating to ticket:', error);
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Erstellen des Tickets';
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const endChat = async (wasHelpful: boolean) => {
    if (!conversation) return;

    try {
      await chatService.endConversation(conversation.id, wasHelpful ? 'ai_resolved' : 'user_left');
      showToast('Chat beendet', 'success');
      onClose?.();
    } catch (error) {
      showToast('Fehler beim Beenden des Chats', 'error');
    }
  };

  const renderMessage = (message: ChatMessageType) => {
    const isUser = message.sender_type === 'user';
    const isSystem = message.sender_type === 'system';

    if (isSystem) {
      return (
        <View key={message.id} style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>{message.message}</Text>
        </View>
      );
    }

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.aiMessageContainer,
        ]}
      >
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.aiMessageText]}>
            {message.message}
          </Text>

          {!isUser && message.ai_confidence_score !== undefined && message.ai_confidence_score < 0.8 && (
            <View style={styles.confidenceIndicator}>
              <AlertCircle size={12} color="#f59e0b" />
              <Text style={styles.confidenceText}>
                Unsicher ({Math.round(message.ai_confidence_score * 100)}%)
              </Text>
            </View>
          )}
        </View>

        {!isUser && message.was_helpful === null && (
          <View style={styles.feedbackButtons}>
            <TouchableOpacity
              style={styles.feedbackButton}
              onPress={() => markMessageHelpful(message.id, true)}
            >
              <ThumbsUp size={20} color="#10b981" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.feedbackButton}
              onPress={() => markMessageHelpful(message.id, false)}
            >
              <ThumbsDown size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}

        {!isUser && message.was_helpful !== null && message.was_helpful !== undefined && (
          <View style={styles.feedbackIndicator}>
            <Check size={14} color="#10b981" />
            <Text style={styles.feedbackText}>
              {message.was_helpful ? 'Hilfreich' : 'Nicht hilfreich'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading && !conversation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Chat wird geladen...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Modal
        visible={showFeedbackModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Feedback zur Antwort</Text>
              <TouchableOpacity onPress={skipDetailedFeedback}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Was war an der Antwort nicht hilfreich?
            </Text>

            <View style={styles.feedbackTypeContainer}>
              {[
                { value: 'incorrect', label: 'Falsch' },
                { value: 'incomplete', label: 'Unvollständig' },
                { value: 'unclear', label: 'Unklar' },
                { value: 'outdated', label: 'Veraltet' },
                { value: 'other', label: 'Anderes' },
              ].map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.feedbackTypeButton,
                    feedbackType === type.value && styles.feedbackTypeButtonActive,
                  ]}
                  onPress={() => setFeedbackType(type.value as any)}
                >
                  <Text
                    style={[
                      styles.feedbackTypeButtonText,
                      feedbackType === type.value && styles.feedbackTypeButtonTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>
              Zusätzliche Details (optional):
            </Text>
            <TextInput
              style={styles.feedbackInput}
              value={feedbackText}
              onChangeText={setFeedbackText}
              placeholder="Was fehlt oder ist falsch?"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={skipDetailedFeedback}
              >
                <Text style={styles.modalSecondaryButtonText}>Überspringen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimaryButton, isGeneratingImproved && styles.modalPrimaryButtonDisabled]}
                onPress={submitDetailedFeedback}
                disabled={isGeneratingImproved}
              >
                {isGeneratingImproved ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.modalPrimaryButtonText}>Generiere...</Text>
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.modalPrimaryButtonText}>Neue Antwort</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHint}>
              Wir generieren sofort eine verbesserte Antwort für dich!
            </Text>
          </View>
        </View>
      </Modal>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <MessageCircle size={24} color="#6366f1" />
            <Text style={styles.headerTitle}>Miley - Deine digitale Assistentin</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map(renderMessage)}
        {isTyping && (
          <View style={styles.typingIndicator}>
            <View style={styles.typingDot} />
            <View style={[styles.typingDot, { marginLeft: 4 }]} />
            <View style={[styles.typingDot, { marginLeft: 4 }]} />
          </View>
        )}
      </ScrollView>

      {(() => {
        const recentMessages = messages.slice(-5);
        const lowConfidenceCount = recentMessages.filter(
          m => m.sender_type === 'ai' && m.ai_confidence_score !== undefined && m.ai_confidence_score < 0.6
        ).length;
        const unhelpfulCount = recentMessages.filter(
          m => m.sender_type === 'ai' && m.was_helpful === false
        ).length;
        const shouldShowEscalation = lowConfidenceCount >= 2 || unhelpfulCount >= 2;

        return shouldShowEscalation && conversation ? (
          <View style={styles.escalationBanner}>
            <AlertCircle size={16} color="#f59e0b" />
            <Text style={styles.escalationText}>
              Brauchst du persönliche Unterstützung?
            </Text>
            <TouchableOpacity style={styles.escalationButton} onPress={escalateToTicket}>
              <Text style={styles.escalationButtonText}>Support-Ticket</Text>
            </TouchableOpacity>
          </View>
        ) : null;
      })()}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Schreibe eine Nachricht..."
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={500}
          editable={!isTyping}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isTyping) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isTyping}
        >
          <Send size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/app/profile/support/faq')}>
          <Text style={styles.quickActionText}>FAQ durchsuchen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionButton} onPress={escalateToTicket}>
          <Text style={styles.quickActionText}>Ticket erstellen</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  headerSpacer: {
    width: 40,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  aiMessageText: {
    color: '#111827',
  },
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  systemMessageText: {
    fontSize: 13,
    color: '#92400e',
    textAlign: 'center',
  },
  confidenceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  confidenceText: {
    fontSize: 11,
    color: '#f59e0b',
  },
  feedbackButtons: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  feedbackButton: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  feedbackText: {
    fontSize: 12,
    color: '#10b981',
  },
  typingIndicator: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    alignSelf: 'flex-start',
    maxWidth: '20%',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9ca3af',
  },
  escalationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fef3c7',
    borderTopWidth: 1,
    borderTopColor: '#fcd34d',
    gap: 8,
  },
  escalationText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
  },
  escalationButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  escalationButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#6366f1',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  quickActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  feedbackTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  feedbackTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  feedbackTypeButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  feedbackTypeButtonText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  feedbackTypeButtonTextActive: {
    color: '#fff',
  },
  feedbackInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  modalSecondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalPrimaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButtonDisabled: {
    backgroundColor: '#a5b4fc',
  },
  modalPrimaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  modalHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 12,
  },
});
