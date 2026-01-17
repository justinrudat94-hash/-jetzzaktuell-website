import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { MessageCircle, HelpCircle, FileText, Zap, Clock, Users, ArrowLeft, Inbox } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSizes, FontWeights } from '../../constants';

export default function SupportPage() {
  const router = useRouter();

  const supportOptions = [
    {
      id: 'chat',
      title: 'Miley - Deine Digitale Assistentin',
      description: 'Sofortige Hilfe durch deine persönliche KI-Assistentin',
      icon: MessageCircle,
      color: '#6366f1',
      bgColor: '#e0e7ff',
      route: '/profile/chat-support',
      badge: 'Empfohlen',
      badgeColor: '#10b981',
    },
    {
      id: 'faq',
      title: 'FAQ durchsuchen',
      description: 'Finde Antworten auf häufig gestellte Fragen',
      icon: HelpCircle,
      color: '#f59e0b',
      bgColor: '#fef3c7',
      route: '/profile/faq',
      badge: 'Schnell',
      badgeColor: '#f59e0b',
    },
    {
      id: 'my-tickets',
      title: 'Meine Tickets',
      description: 'Verwalte deine Support-Anfragen',
      icon: Inbox,
      color: '#10b981',
      bgColor: '#d1fae5',
      route: '/profile/my-tickets',
      badge: null,
      badgeColor: null,
    },
    {
      id: 'ticket',
      title: 'Ticket erstellen',
      description: 'Direkter Kontakt zu unserem Support-Team',
      icon: FileText,
      color: '#8b5cf6',
      bgColor: '#ede9fe',
      route: '/profile/create-ticket',
      badge: null,
      badgeColor: null,
    },
  ];

  const features = [
    {
      icon: Zap,
      title: 'Schnelle Antworten',
      description: 'Unser KI-Chat antwortet sofort auf deine Fragen',
    },
    {
      icon: Clock,
      title: '24/7 Verfügbar',
      description: 'Hole dir jederzeit Hilfe, wann immer du sie brauchst',
    },
    {
      icon: Users,
      title: 'Persönlicher Support',
      description: 'Bei komplexen Problemen steht unser Team bereit',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hilfe & Support</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Wie können wir dir helfen?</Text>
          <Text style={styles.subtitle}>
            Wähle die beste Option für deine Anfrage
          </Text>
        </View>

      <View style={styles.optionsContainer}>
        {supportOptions.map(option => {
          const Icon = option.icon;
          return (
            <TouchableOpacity
              key={option.id}
              style={styles.optionCard}
              onPress={() => router.push(option.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: option.bgColor }]}>
                <Icon size={32} color={option.color} />
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionHeader}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  {option.badge && (
                    <View style={[styles.badge, { backgroundColor: option.badgeColor }]}>
                      <Text style={styles.badgeText}>{option.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.featuresSection}>
        <Text style={styles.featuresTitle}>Warum unseren Support nutzen?</Text>
        <View style={styles.featuresContainer}>
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <Icon size={24} color="#6366f1" />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>💡 Tipp</Text>
        <Text style={styles.infoText}>
          Starte mit Miley für sofortige Hilfe. Bei komplexen Problemen wird automatisch ein Ticket erstellt und an unser Support-Team weitergeleitet.
        </Text>
      </View>

      <View style={styles.workflow}>
        <Text style={styles.workflowTitle}>So funktioniert's</Text>
        <View style={styles.workflowSteps}>
          <View style={styles.workflowStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>Starte einen Chat oder durchsuche die FAQ</Text>
          </View>
          <View style={styles.stepArrow}>
            <Text style={styles.stepArrowText}>↓</Text>
          </View>
          <View style={styles.workflowStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>Erhalte sofort eine Antwort oder Lösung</Text>
          </View>
          <View style={styles.stepArrow}>
            <Text style={styles.stepArrowText}>↓</Text>
          </View>
          <View style={styles.workflowStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>Bei Bedarf wird ein Ticket an unser Team erstellt</Text>
          </View>
        </View>
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  optionsContainer: {
    padding: 16,
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
    marginLeft: 16,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  featuresSection: {
    padding: 16,
    marginTop: 8,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  featuresContainer: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  featureIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#e0e7ff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  infoSection: {
    backgroundColor: '#fef3c7',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
  workflow: {
    padding: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  workflowTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  workflowSteps: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  workflowStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    backgroundColor: '#6366f1',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 20,
  },
  stepArrow: {
    paddingLeft: 16,
    paddingVertical: 8,
  },
  stepArrowText: {
    fontSize: 20,
    color: '#d1d5db',
  },
});
