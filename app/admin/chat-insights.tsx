import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { MessageCircle, TrendingUp, TrendingDown, AlertCircle, CheckCircle, XCircle, Plus, Edit2, BarChart3 } from 'lucide-react-native';
import { chatService, KnowledgeBaseEntry } from '@/services/chatService';
import { useToast } from '@/utils/toastContext';

export default function ChatInsights() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [unresolvedTopics, setUnresolvedTopics] = useState<any[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'topics' | 'knowledge'>('overview');
  const [showAddKnowledge, setShowAddKnowledge] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState<KnowledgeBaseEntry | null>(null);
  const [formData, setFormData] = useState({
    question_pattern: '',
    answer_template: '',
    category: '',
    keywords: '',
    confidence_threshold: '0.70',
    priority: '0',
  });
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [analyticsData, topicsData, knowledgeData] = await Promise.all([
        chatService.getChatAnalytics(7),
        chatService.getTopUnresolvedTopics(20),
        chatService.getKnowledgeBase({ is_active: true }),
      ]);
      setAnalytics(analyticsData);
      setUnresolvedTopics(topicsData);
      setKnowledgeBase(knowledgeData);
    } catch (error) {
      showToast('Fehler beim Laden der Daten', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openKnowledgeModal = (entry?: KnowledgeBaseEntry) => {
    if (entry) {
      setEditingKnowledge(entry);
      setFormData({
        question_pattern: entry.question_pattern,
        answer_template: entry.answer_template,
        category: entry.category,
        keywords: entry.keywords.join(', '),
        confidence_threshold: entry.confidence_threshold.toString(),
        priority: entry.priority.toString(),
      });
    } else {
      setEditingKnowledge(null);
      setFormData({
        question_pattern: '',
        answer_template: '',
        category: '',
        keywords: '',
        confidence_threshold: '0.70',
        priority: '0',
      });
    }
    setShowAddKnowledge(true);
  };

  const saveKnowledge = async () => {
    try {
      const knowledgeData = {
        question_pattern: formData.question_pattern,
        answer_template: formData.answer_template,
        category: formData.category,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k),
        confidence_threshold: parseFloat(formData.confidence_threshold),
        priority: parseInt(formData.priority) || 0,
        source: 'manual' as const,
        is_active: true,
        language: 'de',
      };

      if (editingKnowledge) {
        await chatService.updateKnowledgeBaseEntry(editingKnowledge.id, knowledgeData);
        showToast('Wissen aktualisiert', 'success');
      } else {
        await chatService.addKnowledgeBaseEntry(knowledgeData);
        showToast('Wissen hinzugefügt', 'success');
      }

      setShowAddKnowledge(false);
      loadData();
    } catch (error) {
      showToast('Fehler beim Speichern', 'error');
    }
  };

  const toggleKnowledgeStatus = async (id: string, currentStatus: boolean) => {
    try {
      await chatService.updateKnowledgeBaseEntry(id, { is_active: !currentStatus });
      showToast('Status aktualisiert', 'success');
      loadData();
    } catch (error) {
      showToast('Fehler beim Aktualisieren', 'error');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <MessageCircle size={28} color="#6366f1" />
        <Text style={styles.title}>Chat Analytics & Insights</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <BarChart3 size={18} color={activeTab === 'overview' ? '#6366f1' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Übersicht</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'topics' && styles.activeTab]}
          onPress={() => setActiveTab('topics')}
        >
          <AlertCircle size={18} color={activeTab === 'topics' ? '#6366f1' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'topics' && styles.activeTabText]}>
            Ungelöst ({unresolvedTopics.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'knowledge' && styles.activeTab]}
          onPress={() => setActiveTab('knowledge')}
        >
          <MessageCircle size={18} color={activeTab === 'knowledge' ? '#6366f1' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'knowledge' && styles.activeTabText]}>
            Wissen ({knowledgeBase.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'overview' && analytics && (
        <View style={styles.content}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <MessageCircle size={24} color="#6366f1" />
              <Text style={styles.statValue}>{analytics.total_conversations}</Text>
              <Text style={styles.statLabel}>Gespräche (7 Tage)</Text>
            </View>

            <View style={styles.statCard}>
              <CheckCircle size={24} color="#10b981" />
              <Text style={styles.statValue}>{analytics.resolved_conversations}</Text>
              <Text style={styles.statLabel}>Gelöst</Text>
            </View>

            <View style={styles.statCard}>
              <AlertCircle size={24} color="#f59e0b" />
              <Text style={styles.statValue}>{analytics.escalated_conversations}</Text>
              <Text style={styles.statLabel}>Eskaliert</Text>
            </View>

            <View style={styles.statCard}>
              <TrendingUp size={24} color="#6366f1" />
              <Text style={styles.statValue}>{analytics.success_rate}%</Text>
              <Text style={styles.statLabel}>Erfolgsrate</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{analytics.avg_satisfaction || 'N/A'}</Text>
              <Text style={styles.statLabel}>Ø Zufriedenheit</Text>
              <Text style={styles.statSubtext}>von 5.0</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{analytics.avg_messages_per_conversation}</Text>
              <Text style={styles.statLabel}>Ø Nachrichten</Text>
              <Text style={styles.statSubtext}>pro Chat</Text>
            </View>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>Wichtige Erkenntnisse</Text>
            <View style={styles.insightItem}>
              <TrendingUp size={20} color="#10b981" />
              <Text style={styles.insightText}>
                {analytics.success_rate}% der Chats wurden erfolgreich gelöst
              </Text>
            </View>
            <View style={styles.insightItem}>
              {analytics.escalated_conversations > analytics.resolved_conversations ? (
                <>
                  <TrendingDown size={20} color="#ef4444" />
                  <Text style={styles.insightText}>
                    Mehr Eskalationen als Lösungen - Knowledge Base verbessern
                  </Text>
                </>
              ) : (
                <>
                  <CheckCircle size={20} color="#10b981" />
                  <Text style={styles.insightText}>
                    Gute Performance - KI löst die meisten Anfragen
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      )}

      {activeTab === 'topics' && (
        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Häufig eskalierte Themen</Text>
            <Text style={styles.sectionSubtitle}>
              Diese Themen konnten nicht vom Chat gelöst werden
            </Text>
          </View>

          {unresolvedTopics.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle size={48} color="#10b981" />
              <Text style={styles.emptyText}>Keine eskalierten Themen</Text>
            </View>
          ) : (
            unresolvedTopics.map((topic, index) => (
              <View key={topic.conversation_id} style={styles.topicCard}>
                <View style={styles.topicHeader}>
                  <View style={styles.topicBadge}>
                    <Text style={styles.topicNumber}>#{index + 1}</Text>
                  </View>
                  <View style={styles.topicMeta}>
                    <Text style={styles.topicDate}>
                      {new Date(topic.escalated_at).toLocaleDateString('de-DE')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.topicText}>{topic.topic}</Text>
                {topic.ticket_id && (
                  <Text style={styles.topicTicket}>Ticket: #{topic.ticket_id.substring(0, 8)}</Text>
                )}
                <TouchableOpacity
                  style={styles.addToKnowledgeButton}
                  onPress={() => openKnowledgeModal()}
                >
                  <Plus size={16} color="#6366f1" />
                  <Text style={styles.addToKnowledgeText}>Als Wissen speichern</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

      {activeTab === 'knowledge' && (
        <View style={styles.content}>
          <TouchableOpacity style={styles.addButton} onPress={() => openKnowledgeModal()}>
            <Plus size={20} color="#fff" />
            <Text style={styles.addButtonText}>Wissen hinzufügen</Text>
          </TouchableOpacity>

          {knowledgeBase.map(entry => (
            <View key={entry.id} style={styles.knowledgeCard}>
              <View style={styles.knowledgeHeader}>
                <View style={styles.knowledgeBadges}>
                  <View style={[styles.badge, entry.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                    <Text style={styles.badgeText}>{entry.is_active ? 'Aktiv' : 'Inaktiv'}</Text>
                  </View>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{entry.category}</Text>
                  </View>
                </View>
                <View style={styles.knowledgeActions}>
                  <TouchableOpacity onPress={() => openKnowledgeModal(entry)}>
                    <Edit2 size={18} color="#6366f1" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleKnowledgeStatus(entry.id, entry.is_active)}>
                    {entry.is_active ? (
                      <XCircle size={18} color="#ef4444" />
                    ) : (
                      <CheckCircle size={18} color="#10b981" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.knowledgeQuestion}>{entry.question_pattern}</Text>
              <Text style={styles.knowledgeAnswer} numberOfLines={2}>{entry.answer_template}</Text>
              <View style={styles.knowledgeStats}>
                <Text style={styles.knowledgeStat}>📊 {entry.usage_count} verwendet</Text>
                <Text style={styles.knowledgeStat}>✅ {entry.success_rate.toFixed(1)}% Erfolg</Text>
                <Text style={styles.knowledgeStat}>🎯 {(entry.confidence_threshold * 100).toFixed(0)}% Schwelle</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Modal visible={showAddKnowledge} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>
                {editingKnowledge ? 'Wissen bearbeiten' : 'Wissen hinzufügen'}
              </Text>

              <Text style={styles.label}>Frage-Muster *</Text>
              <TextInput
                style={styles.input}
                value={formData.question_pattern}
                onChangeText={(text) => setFormData({ ...formData, question_pattern: text })}
                placeholder="Wie kann ich...?"
              />

              <Text style={styles.label}>Antwort-Vorlage *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.answer_template}
                onChangeText={(text) => setFormData({ ...formData, answer_template: text })}
                placeholder="Hier ist die Antwort..."
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Kategorie *</Text>
              <TextInput
                style={styles.input}
                value={formData.category}
                onChangeText={(text) => setFormData({ ...formData, category: text })}
                placeholder="account, payment, event"
              />

              <Text style={styles.label}>Keywords (kommagetrennt)</Text>
              <TextInput
                style={styles.input}
                value={formData.keywords}
                onChangeText={(text) => setFormData({ ...formData, keywords: text })}
                placeholder="login, passwort, vergessen"
              />

              <Text style={styles.label}>Konfidenz-Schwelle (0-1)</Text>
              <TextInput
                style={styles.input}
                value={formData.confidence_threshold}
                onChangeText={(text) => setFormData({ ...formData, confidence_threshold: text })}
                placeholder="0.70"
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Priorität</Text>
              <TextInput
                style={styles.input}
                value={formData.priority}
                onChangeText={(text) => setFormData({ ...formData, priority: text })}
                placeholder="0"
                keyboardType="numeric"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowAddKnowledge(false)}
                >
                  <Text style={styles.cancelButtonText}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={saveKnowledge}
                >
                  <Text style={styles.saveButtonText}>Speichern</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#6366f1',
  },
  content: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  statSubtext: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  insightCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
  },
  topicCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  topicBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  topicNumber: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
  },
  topicMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  topicDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  topicText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
    marginBottom: 8,
  },
  topicTicket: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
    marginBottom: 12,
  },
  addToKnowledgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    gap: 6,
  },
  addToKnowledgeText: {
    fontSize: 13,
    color: '#4338ca',
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  knowledgeCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  knowledgeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  knowledgeBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadge: {
    backgroundColor: '#d1fae5',
  },
  inactiveBadge: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    color: '#4338ca',
    fontWeight: '600',
  },
  knowledgeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  knowledgeQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  knowledgeAnswer: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  knowledgeStats: {
    flexDirection: 'row',
    gap: 12,
  },
  knowledgeStat: {
    fontSize: 12,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#6366f1',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
