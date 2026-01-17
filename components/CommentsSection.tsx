import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MessageCircle, Send, ThumbsUp, Trash2, CornerDownRight } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';
import {
  Comment,
  createComment,
  getEventComments,
  likeComment,
  unlikeComment,
  deleteComment,
} from '../services/commentService';
import { useAuth } from '../utils/authContext';

interface CommentsSectionProps {
  eventId: string;
}

export default function CommentsSection({ eventId }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [eventId]);

  const loadComments = async () => {
    setLoading(true);
    const data = await getEventComments(eventId);
    setComments(data);
    setLoading(false);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    if (!user) {
      Alert.alert('Anmeldung erforderlich', 'Bitte melde dich an, um zu kommentieren');
      return;
    }

    setSubmitting(true);
    const result = await createComment(eventId, newComment.trim(), replyTo || undefined);
    setSubmitting(false);

    if (result.success) {
      setNewComment('');
      setReplyTo(null);
      loadComments();
    } else {
      Alert.alert('Fehler', result.error || 'Kommentar konnte nicht gepostet werden');
    }
  };

  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    if (!user) {
      Alert.alert('Anmeldung erforderlich', 'Bitte melde dich an, um zu liken');
      return;
    }

    if (isLiked) {
      await unlikeComment(commentId);
    } else {
      await likeComment(commentId);
    }

    loadComments();
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert(
      'Kommentar löschen',
      'Möchtest du diesen Kommentar wirklich löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteComment(commentId);
            if (result.success) {
              loadComments();
            }
          },
        },
      ]
    );
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <View
      key={comment.id}
      style={[styles.commentContainer, isReply && styles.replyContainer]}
    >
      <View style={styles.commentHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {comment.user?.username?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.commentHeaderInfo}>
          <Text style={styles.username}>{comment.user?.username || 'Unbekannt'}</Text>
          <Text style={styles.timestamp}>
            {new Date(comment.created_at).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        {user?.id === comment.user_id && (
          <TouchableOpacity
            onPress={() => handleDeleteComment(comment.id)}
            style={styles.deleteButton}
          >
            <Trash2 size={16} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.commentText}>{comment.content}</Text>

      {comment.is_flagged && (
        <View style={styles.flaggedBadge}>
          <Text style={styles.flaggedText}>⚠️ Zur Überprüfung markiert</Text>
        </View>
      )}

      <View style={styles.commentActions}>
        <TouchableOpacity
          onPress={() => handleLikeComment(comment.id, comment.user_has_liked || false)}
          style={styles.actionButton}
        >
          <ThumbsUp
            size={16}
            color={comment.user_has_liked ? Colors.primary : Colors.textSecondary}
            fill={comment.user_has_liked ? Colors.primary : 'none'}
          />
          <Text style={styles.actionText}>{comment.likes_count || 0}</Text>
        </TouchableOpacity>

        {!isReply && (
          <TouchableOpacity
            onPress={() => setReplyTo(comment.id)}
            style={styles.actionButton}
          >
            <CornerDownRight size={16} color={Colors.textSecondary} />
            <Text style={styles.actionText}>Antworten</Text>
          </TouchableOpacity>
        )}
      </View>

      {comment.replies && comment.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {comment.replies.map((reply) => renderComment(reply, true))}
        </View>
      )}

      {replyTo === comment.id && (
        <View style={styles.replyInputContainer}>
          <TextInput
            style={styles.replyInput}
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Deine Antwort..."
            placeholderTextColor={Colors.gray500}
            multiline
          />
          <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.cancelReplyButton}>
            <Text style={styles.cancelReplyText}>Abbrechen</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MessageCircle size={20} color={Colors.textPrimary} />
        <Text style={styles.headerTitle}>
          Kommentare ({comments.length})
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newComment}
          onChangeText={setNewComment}
          placeholder={
            replyTo
              ? 'Antwort schreiben...'
              : 'Was denkst du über dieses Event?'
          }
          placeholderTextColor={Colors.gray500}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          onPress={handleSubmitComment}
          style={[
            styles.sendButton,
            (!newComment.trim() || submitting) && styles.sendButtonDisabled,
          ]}
          disabled={!newComment.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Send size={20} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.commentsScroll}>
        {comments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MessageCircle size={48} color={Colors.gray400} />
            <Text style={styles.emptyText}>Noch keine Kommentare</Text>
            <Text style={styles.emptySubtext}>Sei der Erste, der kommentiert!</Text>
          </View>
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.gray300,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.gray400,
  },
  commentsScroll: {
    flex: 1,
  },
  commentContainer: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  replyContainer: {
    marginLeft: Spacing.xl,
    borderLeftWidth: 2,
    borderLeftColor: Colors.gray300,
    paddingLeft: Spacing.md,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  commentHeaderInfo: {
    flex: 1,
  },
  username: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
  },
  timestamp: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  commentText: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  flaggedBadge: {
    backgroundColor: Colors.warningLight,
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  flaggedText: {
    fontSize: FontSizes.sm,
    color: Colors.warning,
  },
  commentActions: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  repliesContainer: {
    marginTop: Spacing.md,
  },
  replyInputContainer: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  replyInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  cancelReplyButton: {
    alignSelf: 'flex-start',
  },
  cancelReplyText: {
    fontSize: FontSizes.sm,
    color: Colors.error,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSizes.md,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
});
