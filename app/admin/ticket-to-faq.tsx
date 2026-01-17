import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { ArrowLeft, CheckCircle, TrendingUp, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSizes, FontWeights } from '../../constants';
import { supportService } from '../../services/supportService';
import { faqService } from '../../services/faqService';
import { useAuth } from '../../utils/authContext';
import { useToast } from '../../utils/toastContext';

interface FAQCandidate {
  issue_id: string;
  category: string;
  problem_pattern: string;
  suggested_answer: string;
  occurrence_count: number;
  success_rate: float;
  is_faq_candidate: boolean;
}

export default function TicketToFAQPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<FAQCandidate[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.is_admin) {
      router.replace('/');
      return;
    }

    loadFAQCandidates();
  }, [profile]);

  const loadFAQCandidates = async () => {
    setLoading(true);
    try {
      const data = await supportService.getFAQSuggestions();
      setCandidates(data || []);
    } catch (error) {
      console.error('Error loading FAQ candidates:', error);
      showToast('Fehler beim Laden der FAQ-Vorschläge', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFAQ = async (candidate: FAQCandidate) => {
    setProcessing(candidate.issue_id);
    try {
      const result = await faqService.createFAQItem({
        question: candidate.problem_pattern,
        answer: candidate.suggested_answer,
        category: candidate.category,
        is_active: true,
      });

      if (result) {
        showToast('FAQ erfolgreich erstellt!', 'success');
        loadFAQCandidates();
      }
    } catch (error: any) {
      console.error('Error creating FAQ:', error);
      showToast(error.message || 'Fehler beim Erstellen des FAQ-Eintrags', 'error');
    } finally {
      setProcessing(null);
    }
  };

  if (!profile?.is_admin) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FAQ aus Tickets</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TrendingUp size={40} color={Colors.primary} />
          <Text style={styles.title}>FAQ-Vorschläge aus Support-Tickets</Text>
          <Text style={styles.subtitle}>
            Diese Probleme treten häufig auf und haben erfolgreiche Lösungen
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Lade FAQ-Vorschläge...</Text>
          </View>
        ) : candidates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AlertCircle size={48} color={Colors.gray400} />
            <Text style={styles.emptyText}>Keine FAQ-Vorschläge verfügbar</Text>
            <Text style={styles.emptySubtext}>
              Es gibt aktuell keine wiederkehrenden Probleme mit erfolgreichen Lösungen
            </Text>
          </View>
        ) : (
          <View style={styles.candidatesList}>
            {candidates.map((candidate) => (
              <View key={candidate.issue_id} style={styles.candidateCard}>
                <View style={styles.candidateHeader}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{candidate.category}</Text>
                  </View>
                  <View style={styles.statsRow}>
                    <View style={styles.statBadge}>
                      <Text style={styles.statLabel}>{candidate.occurrence_count}x</Text>
                    </View>
                    <View style={[styles.statBadge, styles.successBadge]}>
                      <Text style={styles.statLabel}>
                        {(candidate.success_rate * 100).toFixed(0)}% Erfolg
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.problemText}>{candidate.problem_pattern}</Text>

                <View style={styles.answerContainer}>
                  <Text style={styles.answerLabel}>Vorgeschlagene Antwort:</Text>
                  <Text style={styles.answerText}>{candidate.suggested_answer}</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.createButton,
                    processing === candidate.issue_id && styles.createButtonDisabled,
                  ]}
                  onPress={() => handleCreateFAQ(candidate)}
                  disabled={processing === candidate.issue_id}
                >
                  {processing === candidate.issue_id ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <CheckCircle size={20} color={Colors.white} />
                      <Text style={styles.createButtonText}>Als FAQ hinzufügen</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  placeholder: {
    width: 40,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  header: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    marginTop: Spacing.md,
  },
  emptyContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSizes.md,
    color: Colors.gray500,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  candidatesList: {
    padding: Spacing.md,
  },
  candidateCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  candidateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryBadge: {
    backgroundColor: Colors.blue100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.blue700,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  statBadge: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
  },
  successBadge: {
    backgroundColor: Colors.green100,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
  },
  problemText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  answerContainer: {
    backgroundColor: Colors.gray50,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  answerLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
  },
  answerText: {
    fontSize: FontSizes.md,
    color: Colors.gray700,
    lineHeight: 22,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  createButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  createButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
});
