import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { ArrowLeft, AlertCircle, Check, MessageCircle, FileText, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSizes, FontWeights } from '../../constants';
import { supportService } from '../../services/supportService';
import { faqService } from '../../services/faqService';
import { useAuth } from '../../utils/authContext';
import { useToast } from '../../utils/toastContext';

const CATEGORIES = [
  { id: 'technical', label: 'Technisches Problem', icon: '🔧', color: '#ef4444' },
  { id: 'account', label: 'Account & Profil', icon: '👤', color: '#3b82f6' },
  { id: 'events', label: 'Events', icon: '🎉', color: '#8b5cf6' },
  { id: 'tickets', label: 'Tickets', icon: '🎫', color: '#f59e0b' },
  { id: 'coins', label: 'Coins & Zahlung', icon: '💰', color: '#10b981' },
  { id: 'premium', label: 'Premium', icon: '⭐', color: '#fbbf24' },
  { id: 'livestream', label: 'Livestream', icon: '📹', color: '#ec4899' },
  { id: 'moderation', label: 'Meldung', icon: '⚠️', color: '#dc2626' },
  { id: 'general', label: 'Sonstiges', icon: '💬', color: '#6b7280' },
];

interface FAQSuggestion {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export default function CreateTicketPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFAQSuggestions, setShowFAQSuggestions] = useState(false);
  const [faqSuggestions, setFAQSuggestions] = useState<FAQSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (subject.length > 10 || description.length > 20) {
      searchFAQSuggestions();
    } else {
      setFAQSuggestions([]);
      setShowFAQSuggestions(false);
    }
  }, [subject, description]);

  const searchFAQSuggestions = async () => {
    if (loadingSuggestions) return;

    setLoadingSuggestions(true);
    try {
      const searchText = `${subject} ${description}`;
      const suggestions = await faqService.searchFAQs(searchText);

      if (suggestions && suggestions.length > 0) {
        setFAQSuggestions(suggestions.slice(0, 3));
        setShowFAQSuggestions(true);
      } else {
        setFAQSuggestions([]);
        setShowFAQSuggestions(false);
      }
    } catch (error) {
      console.error('Error searching FAQ:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!user) {
      showToast('Bitte melde dich zuerst an', 'error');
      return;
    }

    if (!selectedCategory) {
      showToast('Bitte wähle eine Kategorie', 'error');
      return;
    }

    if (subject.trim().length < 5) {
      showToast('Der Betreff muss mindestens 5 Zeichen lang sein', 'error');
      return;
    }

    if (description.trim().length < 20) {
      showToast('Die Beschreibung muss mindestens 20 Zeichen lang sein', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await supportService.createTicket({
        subject: subject.trim(),
        description: description.trim(),
        category: selectedCategory,
      });

      if (result) {
        setTicketId(result.id);
        setTicketCreated(true);
        showToast('Ticket erfolgreich erstellt!', 'success');
      }
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      showToast(error.message || 'Fehler beim Erstellen des Tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDismissSuggestion = () => {
    setShowFAQSuggestions(false);
  };

  if (ticketCreated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.backButton}>
            <X size={24} color={Colors.gray800} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ticket erstellt</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.container}>
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Check size={48} color={Colors.white} />
            </View>
            <Text style={styles.successTitle}>Ticket erfolgreich erstellt!</Text>
            <Text style={styles.successMessage}>
              Dein Ticket wurde erfasst und unser Support-Team wird sich schnellstmöglich darum kümmern.
            </Text>
            <View style={styles.ticketInfo}>
              <Text style={styles.ticketLabel}>Ticket-ID:</Text>
              <Text style={styles.ticketValue}>#{ticketId?.slice(0, 8)}</Text>
            </View>
            <Text style={styles.infoText}>
              Du erhältst eine Email-Bestätigung und kannst auf diese Email antworten, um weitere Informationen hinzuzufügen.
            </Text>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => router.push('/profile/my-tickets')}
            >
              <Text style={styles.doneButtonText}>Meine Tickets ansehen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setTicketCreated(false);
                setTicketId(null);
                setSubject('');
                setDescription('');
                setSelectedCategory(null);
              }}
            >
              <Text style={styles.secondaryButtonText}>Weiteres Ticket erstellen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backToHomeButton}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.backToHomeButtonText}>Zurück zum Profil</Text>
            </TouchableOpacity>
          </View>
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
        <Text style={styles.headerTitle}>Ticket erstellen</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <FileText size={40} color={Colors.primary} />
          <Text style={styles.title}>Support-Ticket erstellen</Text>
          <Text style={styles.subtitle}>
            Beschreibe dein Problem und unser Team hilft dir schnellstmöglich
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kategorie wählen *</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  selectedCategory === category.id && styles.categoryCardSelected,
                  { borderColor: selectedCategory === category.id ? category.color : Colors.gray200 },
                ]}
                onPress={() => setSelectedCategory(category.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text
                  style={[
                    styles.categoryLabel,
                    selectedCategory === category.id && styles.categoryLabelSelected,
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Betreff *</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="z.B. Ich kann keine Coins kaufen"
            placeholderTextColor={Colors.gray400}
            maxLength={100}
          />
          <Text style={styles.charCount}>{subject.length}/100</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Beschreibung *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Beschreibe dein Problem so detailliert wie möglich..."
            placeholderTextColor={Colors.gray400}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.charCount}>{description.length}/1000</Text>
        </View>

        {showFAQSuggestions && faqSuggestions.length > 0 && (
          <View style={styles.faqSuggestionsCard}>
            <View style={styles.faqHeader}>
              <MessageCircle size={20} color={Colors.primary} />
              <Text style={styles.faqTitle}>Hilft dir vielleicht eine dieser Antworten?</Text>
            </View>
            {faqSuggestions.map((faq, index) => (
              <TouchableOpacity
                key={faq.id}
                style={styles.faqItem}
                onPress={() => router.push(`/profile/faq?id=${faq.id}`)}
              >
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Text style={styles.faqAnswer} numberOfLines={2}>
                  {faq.answer}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.dismissButton} onPress={handleDismissSuggestion}>
              <Text style={styles.dismissButtonText}>
                Nein, ich möchte trotzdem ein Ticket erstellen
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoCard}>
          <AlertCircle size={20} color={Colors.blue500} />
          <Text style={styles.infoCardText}>
            Tipp: Je detaillierter du dein Problem beschreibst, desto schneller können wir dir helfen!
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedCategory || subject.length < 5 || description.length < 20 || loading) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleCreateTicket}
          disabled={!selectedCategory || subject.length < 5 || description.length < 20 || loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Ticket erstellen</Text>
          )}
        </TouchableOpacity>
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
  },
  categoryCard: {
    width: '31%',
    margin: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  categoryCardSelected: {
    backgroundColor: Colors.blue50,
    borderWidth: 2,
  },
  categoryIcon: {
    fontSize: 28,
    marginBottom: Spacing.xs,
  },
  categoryLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray700,
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.gray900,
  },
  textArea: {
    minHeight: 120,
    paddingTop: Spacing.md,
  },
  charCount: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  faqSuggestionsCard: {
    backgroundColor: Colors.blue50,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.blue200,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  faqTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  faqItem: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  faqQuestion: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  faqAnswer: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  dismissButton: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
  },
  dismissButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.blue600,
    textAlign: 'center',
    fontWeight: FontWeights.medium,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.blue50,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoCardText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    marginLeft: Spacing.sm,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  submitButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.green500,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  ticketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  ticketLabel: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    marginRight: Spacing.xs,
  },
  ticketValue: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: Spacing.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  doneButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 12,
    padding: Spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
  },
  backToHomeButton: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
  },
  backToHomeButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    textAlign: 'center',
  },
});
