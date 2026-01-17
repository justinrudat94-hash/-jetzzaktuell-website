import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { Plus, Edit2, Trash2, Check, X, AlertCircle, TrendingUp } from 'lucide-react-native';
import { faqService, FAQItem, FAQSuggestion } from '@/services/faqService';
import { useToast } from '@/utils/toastContext';

export default function FAQManagement() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [suggestions, setSuggestions] = useState<FAQSuggestion[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'faqs' | 'suggestions'>('faqs');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQItem | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    question_de: '',
    answer_de: '',
    question_en: '',
    answer_en: '',
    question_tr: '',
    answer_tr: '',
    tags: '',
    priority: '0',
    is_published: false,
  });
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [faqsData, suggestionsData, statsData] = await Promise.all([
        faqService.getAllFAQs(),
        faqService.getFAQSuggestions(),
        faqService.getFAQStats(),
      ]);
      setFaqs(faqsData);
      setSuggestions(suggestionsData.filter(s => s.status === 'pending'));
      setStats(statsData);
    } catch (error) {
      showToast('Fehler beim Laden der Daten', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (faq?: FAQItem) => {
    if (faq) {
      setEditingFAQ(faq);
      setFormData({
        category: faq.category,
        question_de: faq.question_de,
        answer_de: faq.answer_de,
        question_en: faq.question_en || '',
        answer_en: faq.answer_en || '',
        question_tr: faq.question_tr || '',
        answer_tr: faq.answer_tr || '',
        tags: faq.tags.join(', '),
        priority: faq.priority.toString(),
        is_published: faq.is_published,
      });
    } else {
      setEditingFAQ(null);
      setFormData({
        category: '',
        question_de: '',
        answer_de: '',
        question_en: '',
        answer_en: '',
        question_tr: '',
        answer_tr: '',
        tags: '',
        priority: '0',
        is_published: false,
      });
    }
    setShowEditModal(true);
  };

  const saveFAQ = async () => {
    try {
      const faqData = {
        category: formData.category,
        question_de: formData.question_de,
        answer_de: formData.answer_de,
        question_en: formData.question_en || undefined,
        answer_en: formData.answer_en || undefined,
        question_tr: formData.question_tr || undefined,
        answer_tr: formData.answer_tr || undefined,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        priority: parseInt(formData.priority) || 0,
        is_published: formData.is_published,
      };

      if (editingFAQ) {
        await faqService.updateFAQ(editingFAQ.id, faqData);
        showToast('FAQ aktualisiert', 'success');
      } else {
        await faqService.createFAQ(faqData);
        showToast('FAQ erstellt', 'success');
      }

      setShowEditModal(false);
      loadData();
    } catch (error) {
      showToast('Fehler beim Speichern', 'error');
    }
  };

  const deleteFAQ = async (id: string) => {
    try {
      await faqService.deleteFAQ(id);
      showToast('FAQ gelöscht', 'success');
      loadData();
    } catch (error) {
      showToast('Fehler beim Löschen', 'error');
    }
  };

  const handleSuggestion = async (suggestion: FAQSuggestion, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await faqService.implementSuggestion(suggestion.id, {
          category: suggestion.category || 'general',
          question_de: suggestion.suggested_question,
          answer_de: suggestion.suggested_answer || '',
          tags: [],
          priority: 0,
          is_published: false,
        });
        showToast('Vorschlag als FAQ erstellt', 'success');
      } else {
        await faqService.updateSuggestionStatus(suggestion.id, 'rejected');
        showToast('Vorschlag abgelehnt', 'success');
      }
      loadData();
    } catch (error) {
      showToast('Fehler beim Verarbeiten des Vorschlags', 'error');
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
        <Text style={styles.title}>FAQ Verwaltung</Text>
      </View>

      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Gesamt</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.published}</Text>
            <Text style={styles.statLabel}>Veröffentlicht</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalViews}</Text>
            <Text style={styles.statLabel}>Aufrufe</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.helpfulRate}%</Text>
            <Text style={styles.statLabel}>Hilfreich</Text>
          </View>
        </View>
      )}

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'faqs' && styles.activeTab]}
          onPress={() => setActiveTab('faqs')}
        >
          <Text style={[styles.tabText, activeTab === 'faqs' && styles.activeTabText]}>
            FAQs ({faqs.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'suggestions' && styles.activeTab]}
          onPress={() => setActiveTab('suggestions')}
        >
          <Text style={[styles.tabText, activeTab === 'suggestions' && styles.activeTabText]}>
            Vorschläge ({suggestions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'faqs' && (
        <View style={styles.content}>
          <TouchableOpacity style={styles.addButton} onPress={() => openEditModal()}>
            <Plus size={20} color="#fff" />
            <Text style={styles.addButtonText}>Neue FAQ erstellen</Text>
          </TouchableOpacity>

          {faqs.map(faq => (
            <View key={faq.id} style={styles.faqCard}>
              <View style={styles.faqHeader}>
                <View style={styles.faqBadges}>
                  <View style={[styles.badge, faq.is_published ? styles.publishedBadge : styles.draftBadge]}>
                    <Text style={styles.badgeText}>
                      {faq.is_published ? 'Veröffentlicht' : 'Entwurf'}
                    </Text>
                  </View>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{faq.category}</Text>
                  </View>
                </View>
                <View style={styles.faqActions}>
                  <TouchableOpacity onPress={() => openEditModal(faq)} style={styles.iconButton}>
                    <Edit2 size={18} color="#6366f1" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteFAQ(faq.id)} style={styles.iconButton}>
                    <Trash2 size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.faqQuestion}>{faq.question_de}</Text>
              <Text style={styles.faqAnswer} numberOfLines={2}>{faq.answer_de}</Text>
              <View style={styles.faqStats}>
                <Text style={styles.faqStat}>👁 {faq.view_count} Aufrufe</Text>
                <Text style={styles.faqStat}>👍 {faq.helpful_count}</Text>
                <Text style={styles.faqStat}>👎 {faq.not_helpful_count}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {activeTab === 'suggestions' && (
        <View style={styles.content}>
          {suggestions.length === 0 ? (
            <View style={styles.emptyState}>
              <AlertCircle size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>Keine Vorschläge vorhanden</Text>
            </View>
          ) : (
            suggestions.map(suggestion => (
              <View key={suggestion.id} style={styles.suggestionCard}>
                <View style={styles.suggestionHeader}>
                  <View style={styles.suggestionBadge}>
                    <TrendingUp size={14} color="#f59e0b" />
                    <Text style={styles.suggestionFrequency}>{suggestion.frequency}x</Text>
                  </View>
                  <Text style={styles.suggestionSource}>{suggestion.source_type}</Text>
                </View>
                <Text style={styles.suggestionQuestion}>{suggestion.suggested_question}</Text>
                {suggestion.suggested_answer && (
                  <Text style={styles.suggestionAnswer} numberOfLines={3}>
                    {suggestion.suggested_answer}
                  </Text>
                )}
                <View style={styles.suggestionActions}>
                  <TouchableOpacity
                    style={[styles.suggestionButton, styles.approveButton]}
                    onPress={() => handleSuggestion(suggestion, 'approve')}
                  >
                    <Check size={16} color="#fff" />
                    <Text style={styles.suggestionButtonText}>Annehmen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.suggestionButton, styles.rejectButton]}
                    onPress={() => handleSuggestion(suggestion, 'reject')}
                  >
                    <X size={16} color="#fff" />
                    <Text style={styles.suggestionButtonText}>Ablehnen</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>
                {editingFAQ ? 'FAQ bearbeiten' : 'Neue FAQ erstellen'}
              </Text>

              <Text style={styles.label}>Kategorie *</Text>
              <TextInput
                style={styles.input}
                value={formData.category}
                onChangeText={(text) => setFormData({ ...formData, category: text })}
                placeholder="z.B. Account, Zahlungen, Events"
              />

              <Text style={styles.label}>Frage (Deutsch) *</Text>
              <TextInput
                style={styles.input}
                value={formData.question_de}
                onChangeText={(text) => setFormData({ ...formData, question_de: text })}
                placeholder="Wie kann ich...?"
              />

              <Text style={styles.label}>Antwort (Deutsch) *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.answer_de}
                onChangeText={(text) => setFormData({ ...formData, answer_de: text })}
                placeholder="Hier ist die Antwort..."
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Tags (kommagetrennt)</Text>
              <TextInput
                style={styles.input}
                value={formData.tags}
                onChangeText={(text) => setFormData({ ...formData, tags: text })}
                placeholder="login, passwort, account"
              />

              <Text style={styles.label}>Priorität</Text>
              <TextInput
                style={styles.input}
                value={formData.priority}
                onChangeText={(text) => setFormData({ ...formData, priority: text })}
                placeholder="0"
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setFormData({ ...formData, is_published: !formData.is_published })}
              >
                <View style={[styles.checkboxBox, formData.is_published && styles.checkboxBoxChecked]}>
                  {formData.is_published && <Check size={16} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Veröffentlichen</Text>
              </TouchableOpacity>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={saveFAQ}
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
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#6366f1',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#6366f1',
  },
  content: {
    padding: 16,
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
  faqCard: {
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
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  faqBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  publishedBadge: {
    backgroundColor: '#d1fae5',
  },
  draftBadge: {
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
  faqActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  faqStats: {
    flexDirection: 'row',
    gap: 16,
  },
  faqStat: {
    fontSize: 13,
    color: '#9ca3af',
  },
  suggestionCard: {
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
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  suggestionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  suggestionFrequency: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
  },
  suggestionSource: {
    fontSize: 12,
    color: '#6b7280',
  },
  suggestionQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  suggestionAnswer: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  suggestionButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  suggestionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
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
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#374151',
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
