import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { X, Send } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';
import { supabase } from '../lib/supabase';
import { moderateChatMessage, recordViolation } from '../services/moderationService';

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
  is_streamer?: boolean;
}

interface LiveChatOverlayProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  streamerId: string;
  currentUserId: string;
}

export default function LiveChatOverlay({
  visible,
  onClose,
  eventId,
  streamerId,
  currentUserId,
}: LiveChatOverlayProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();

      loadMessages();
      subscribeToMessages();
    } else {
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('live_chat_messages')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (data) {
      setMessages(data);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`chat:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    const moderationResult = await moderateChatMessage(messageText, tempId);

    if (!moderationResult.allowed) {
      alert('Diese Nachricht verstößt gegen unsere Community-Richtlinien und kann nicht gesendet werden.');

      if (moderationResult.riskLevel === 'critical' || moderationResult.riskLevel === 'high') {
        await recordViolation({
          userId: currentUserId,
          violationType: 'inappropriate_chat',
          contentType: 'chat',
          contentId: tempId,
          severity: moderationResult.riskLevel === 'critical' ? 'critical' : 'high',
          description: `Blocked message: ${moderationResult.flaggedCategories?.join(', ')}`,
        });
      }

      return;
    }

    const { error } = await supabase.from('live_chat_messages').insert({
      event_id: eventId,
      user_id: currentUserId,
      message: messageText,
    });

    if (!error) {
      setNewMessage('');
    }
  };

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.chatContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Live-Chat</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                msg.is_streamer && styles.streamerMessage,
              ]}
            >
              <Text
                style={[
                  styles.username,
                  msg.is_streamer && styles.streamerUsername,
                ]}
              >
                {msg.username}
              </Text>
              <Text style={styles.messageText}>{msg.message}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Nachricht schreiben..."
            placeholderTextColor={Colors.gray500}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            onPress={sendMessage}
            style={styles.sendButton}
            disabled={!newMessage.trim()}
          >
            <Send
              size={20}
              color={newMessage.trim() ? Colors.primary : Colors.gray400}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  chatContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  messagesContainer: {
    flex: 1,
    padding: Spacing.md,
  },
  messageRow: {
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.gray100,
    borderRadius: 8,
  },
  streamerMessage: {
    backgroundColor: Colors.primaryLight,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  username: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.gray700,
    marginBottom: 2,
  },
  streamerUsername: {
    color: Colors.primary,
  },
  messageText: {
    fontSize: FontSizes.md,
    color: Colors.gray800,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.gray100,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.gray800,
    marginRight: Spacing.sm,
  },
  sendButton: {
    padding: Spacing.sm,
  },
});
