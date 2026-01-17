import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { Search, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, HelpCircle, MessageCircle, ArrowLeft } from 'lucide-react-native';
import { faqService, FAQItem } from '@/services/faqService';
import { useToast } from '@/utils/toastContext';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, FontSizes, FontWeights } from '@/constants';

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [filteredFAQs, setFilteredFAQs] = useState<FAQItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [userFeedback, setUserFeedback] = useState<{ [key: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  useEffect(() => {
    loadFAQs();
  }, []);

  useEffect(() => {
    filterFAQs();
  }, [searchQuery, selectedCategory, faqs]);

  const loadFAQs = async () => {
    try {
      setIsLoading(true);
      const [faqsData, categoriesData] = await Promise.all([
        faqService.getPublishedFAQs(undefined, locale),
        faqService.getFAQCategories(),
      ]);
      setFaqs(faqsData);
      setCategories(categoriesData);
    } catch (error) {
      showToast('Fehler beim Laden der FAQs', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filterFAQs = () => {
    let filtered = faqs;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(faq => faq.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(faq =>
        faq.question_de.toLowerCase().includes(query) ||
        faq.answer_de.toLowerCase().includes(query) ||
        faq.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredFAQs(filtered);
  };

  const toggleExpand = async (faqId: string) => {
    if (expandedId !== faqId) {
      setExpandedId(faqId);
      await faqService.incrementViewCount(faqId);
    } else {
      setExpandedId(null);
    }
  };

  const submitFeedback = async (faqId: string, wasHelpful: boolean) => {
    try {
      await faqService.submitFeedback(faqId, wasHelpful);
      setUserFeedback({ ...userFeedback, [faqId]: wasHelpful });
      showToast('Danke für dein Feedback!', 'success');
    } catch (error) {
      showToast('Feedback konnte nicht gespeichert werden', 'error');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.gray800} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>FAQ</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>FAQs werden geladen...</Text>
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
        <Text style={styles.headerTitle}>FAQ</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <HelpCircle size={32} color="#6366f1" />
          <Text style={styles.title}>Hilfe & FAQ</Text>
          <Text style={styles.subtitle}>Finde schnell Antworten auf häufige Fragen</Text>
        </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Nach Fragen suchen..."
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        <TouchableOpacity
          style={[styles.categoryChip, selectedCategory === 'all' && styles.categoryChipActive]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[styles.categoryText, selectedCategory === 'all' && styles.categoryTextActive]}>
            Alle
          </Text>
        </TouchableOpacity>
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[styles.categoryText, selectedCategory === category && styles.categoryTextActive]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.content}>
        {filteredFAQs.length === 0 ? (
          <View style={styles.emptyState}>
            <HelpCircle size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>Keine Ergebnisse gefunden</Text>
            <Text style={styles.emptyText}>
              Versuche eine andere Suchanfrage oder kontaktiere unseren Support
            </Text>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => router.push('/profile/chat-support')}
            >
              <MessageCircle size={20} color="#fff" />
              <Text style={styles.chatButtonText}>Mit Miley chatten</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredFAQs.map(faq => (
            <View key={faq.id} style={styles.faqCard}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleExpand(faq.id)}
              >
                <View style={styles.questionContent}>
                  <Text style={styles.questionText}>{faq.question_de}</Text>
                  {expandedId === faq.id ? (
                    <ChevronUp size={20} color="#6366f1" />
                  ) : (
                    <ChevronDown size={20} color="#9ca3af" />
                  )}
                </View>
              </TouchableOpacity>

              {expandedId === faq.id && (
                <View style={styles.answerContainer}>
                  <Text style={styles.answerText}>{faq.answer_de}</Text>

                  {faq.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                      {faq.tags.map((tag, index) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.feedbackSection}>
                    <Text style={styles.feedbackQuestion}>War diese Antwort hilfreich?</Text>
                    <View style={styles.feedbackButtons}>
                      {userFeedback[faq.id] === undefined ? (
                        <>
                          <TouchableOpacity
                            style={styles.feedbackButton}
                            onPress={() => submitFeedback(faq.id, true)}
                          >
                            <ThumbsUp size={18} color="#10b981" />
                            <Text style={styles.feedbackButtonText}>Ja</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.feedbackButton}
                            onPress={() => submitFeedback(faq.id, false)}
                          >
                            <ThumbsDown size={18} color="#ef4444" />
                            <Text style={styles.feedbackButtonText}>Nein</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <View style={styles.feedbackGiven}>
                          <Text style={styles.feedbackGivenText}>
                            {userFeedback[faq.id] ? '✓ Danke für dein Feedback!' : '✓ Feedback gespeichert'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              )}
            </View>
          ))
        )}
      </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Nicht gefunden was du suchst?</Text>
          <TouchableOpacity
            style={styles.footerButton}
            onPress={() => router.push('/profile/chat-support')}
          >
            <MessageCircle size={20} color="#6366f1" />
            <Text style={styles.footerButtonText}>Mit Miley chatten</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
  },
  placeholder: {
    width: 40,
  },
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  categoryScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoryContainer: {
    padding: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#6366f1',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  categoryTextActive: {
    color: '#fff',
  },
  content: {
    padding: 16,
  },
  faqCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  faqQuestion: {
    padding: 16,
  },
  questionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 12,
  },
  answerContainer: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  answerText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  tag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#4338ca',
    fontWeight: '500',
  },
  feedbackSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  feedbackQuestion: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    gap: 6,
  },
  feedbackButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  feedbackGiven: {
    paddingVertical: 10,
  },
  feedbackGivenText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  footerButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
});
