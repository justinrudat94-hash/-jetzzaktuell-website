import React, { useState, useEffect } from 'react';
import { Colors } from '../../constants';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  TrendingUp,
  Eye,
  Radio,
  MessageSquare,
  Calendar,
  Users,
  BarChart3,
} from 'lucide-react-native';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants';
import { aiModerationService } from '../../services/aiModerationService';
import { useAuth } from '../../utils/authContext';

interface AIAnalysis {
  id: string;
  content_type: string;
  content_id: string;
  spam_score: number;
  toxicity_score: number;
  fake_score: number;
  quality_score: number;
  risk_level: string;
  recommended_action: string;
  detected_patterns: string[];
  analyzed_at: string;
}

export default function AIModeration() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState<AIAnalysis[]>([]);
  const [highRiskContent, setHighRiskContent] = useState<AIAnalysis[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'events' | 'livestreams' | 'comments'>('overview');
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    highRisk: 0,
    autoRejected: 0,
    avgProcessingTime: 0,
  });

  useEffect(() => {
    loadData();
  }, [selectedTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (selectedTab === 'overview') {
        const [analyses, highRisk] = await Promise.all([
          aiModerationService.getRecentAnalyses(20),
          aiModerationService.getHighRiskContent(10),
        ]);
        setRecentAnalyses(analyses);
        setHighRiskContent(highRisk);

        setStats({
          totalAnalyses: analyses.length,
          highRisk: highRisk.length,
          autoRejected: analyses.filter(a => a.recommended_action === 'reject').length,
          avgProcessingTime: 0,
        });
      } else {
        const contentType = selectedTab === 'events' ? 'event' : selectedTab === 'livestreams' ? 'livestream' : 'comment';
        const analyses = await aiModerationService.getAnalysisByType(contentType, 30);
        setRecentAnalyses(analyses);
      }
    } catch (error) {
      console.error('Error loading AI moderation data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getRiskColor = (riskLevel: string) => {
    return aiModerationService.getRiskLevelColor(riskLevel);
  };

  const getRiskLabel = (riskLevel: string) => {
    return aiModerationService.getRiskLevelLabel(riskLevel);
  };

  const contentTypeIcons = {
    event: Calendar,
    livestream: Radio,
    comment: MessageSquare,
    profile: Users,
  };

  const contentTypeLabels = {
    event: 'Event',
    livestream: 'Livestream',
    comment: 'Kommentar',
    profile: 'Profil',
  };

  const renderOverviewStats = () => (
    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
          <Shield size={24} color={Colors.primary} />
        </View>
        <Text style={styles.statNumber}>{stats.totalAnalyses}</Text>
        <Text style={styles.statLabel}>Analysen (20 neueste)</Text>
      </View>

      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
          <AlertTriangle size={24} color={Colors.error} />
        </View>
        <Text style={[styles.statNumber, { color: Colors.error }]}>{stats.highRisk}</Text>
        <Text style={styles.statLabel}>High-Risk Inhalte</Text>
      </View>

      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: '#F3E8FF' }]}>
          <TrendingUp size={24} color='#9333EA' />
        </View>
        <Text style={styles.statNumber}>{stats.autoRejected}</Text>
        <Text style={styles.statLabel}>Auto-Abgelehnt</Text>
      </View>

      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
          <BarChart3 size={24} color='#2563EB' />
        </View>
        <Text style={styles.statNumber}>
          {(recentAnalyses.reduce((sum, a) => sum + ((a.quality_score || 0) * 100), 0) / (recentAnalyses.length || 1)).toFixed(0)}%
        </Text>
        <Text style={styles.statLabel}>Ø Qualitäts-Score</Text>
      </View>
    </View>
  );

  const renderAnalysisItem = (analysis: AIAnalysis) => {
    const Icon = contentTypeIcons[analysis.content_type as keyof typeof contentTypeIcons] || Shield;
    const contentLabel = contentTypeLabels[analysis.content_type as keyof typeof contentTypeLabels] || analysis.content_type;

    return (
      <TouchableOpacity key={analysis.id} style={styles.analysisCard}>
        <View style={styles.analysisHeader}>
          <View style={[styles.riskIndicator, { backgroundColor: getRiskColor(analysis.risk_level) }]} />
          <View style={styles.analysisIconContainer}>
            <Icon size={20} color={Colors.primary} />
          </View>
          <View style={styles.analysisInfo}>
            <Text style={styles.analysisType}>{contentLabel}</Text>
            <Text style={styles.analysisDate}>
              {new Date(analysis.analyzed_at).toLocaleString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <View style={[styles.riskBadge, { backgroundColor: getRiskColor(analysis.risk_level) }]}>
            <Text style={styles.riskBadgeText}>{getRiskLabel(analysis.risk_level)}</Text>
          </View>
        </View>

        <View style={styles.scoresContainer}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Spam</Text>
            <Text style={[styles.scoreValue, { color: analysis.spam_score > 0.5 ? Colors.error : Colors.success }]}>
              {(analysis.spam_score * 100).toFixed(0)}%
            </Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Toxizität</Text>
            <Text style={[styles.scoreValue, { color: analysis.toxicity_score > 0.5 ? Colors.error : Colors.success }]}>
              {(analysis.toxicity_score * 100).toFixed(0)}%
            </Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Fake</Text>
            <Text style={[styles.scoreValue, { color: analysis.fake_score > 0.5 ? Colors.error : Colors.success }]}>
              {(analysis.fake_score * 100).toFixed(0)}%
            </Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Qualität</Text>
            <Text style={[styles.scoreValue, { color: analysis.quality_score > 0.7 ? Colors.success : Colors.error }]}>
              {(analysis.quality_score * 100).toFixed(0)}%
            </Text>
          </View>
        </View>

        {analysis.detected_patterns && analysis.detected_patterns.length > 0 && (
          <View style={styles.patternsContainer}>
            <Text style={styles.patternsLabel}>Erkannte Muster:</Text>
            <View style={styles.patternsList}>
              {analysis.detected_patterns.slice(0, 3).map((pattern, index) => (
                <View key={index} style={styles.patternBadge}>
                  <Text style={styles.patternText}>{pattern}</Text>
                </View>
              ))}
              {analysis.detected_patterns.length > 3 && (
                <Text style={styles.morePatterns}>+{analysis.detected_patterns.length - 3} mehr</Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.actionContainer}>
          <Text style={styles.actionLabel}>
            Empfehlung: <Text style={styles.actionValue}>{aiModerationService.getActionLabel(analysis.recommended_action)}</Text>
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Lade KI-Analysen...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KI-Moderation</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && styles.tabActive]}
          onPress={() => setSelectedTab('overview')}
        >
          <Shield size={20} color={selectedTab === 'overview' ? Colors.white : Colors.gray600} />
          <Text style={[styles.tabText, selectedTab === 'overview' && styles.tabTextActive]}>Übersicht</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'events' && styles.tabActive]}
          onPress={() => setSelectedTab('events')}
        >
          <Calendar size={20} color={selectedTab === 'events' ? Colors.white : Colors.gray600} />
          <Text style={[styles.tabText, selectedTab === 'events' && styles.tabTextActive]}>Events</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'livestreams' && styles.tabActive]}
          onPress={() => setSelectedTab('livestreams')}
        >
          <Radio size={20} color={selectedTab === 'livestreams' ? Colors.white : Colors.gray600} />
          <Text style={[styles.tabText, selectedTab === 'livestreams' && styles.tabTextActive]}>Streams</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'comments' && styles.tabActive]}
          onPress={() => setSelectedTab('comments')}
        >
          <MessageSquare size={20} color={selectedTab === 'comments' ? Colors.white : Colors.gray600} />
          <Text style={[styles.tabText, selectedTab === 'comments' && styles.tabTextActive]}>Kommentare</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {selectedTab === 'overview' && renderOverviewStats()}

        {selectedTab === 'overview' && highRiskContent.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>High-Risk Inhalte (10 neueste)</Text>
            {highRiskContent.map(renderAnalysisItem)}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedTab === 'overview' ? 'Letzte Analysen' : `${contentTypeLabels[selectedTab === 'livestreams' ? 'livestream' : selectedTab === 'comments' ? 'comment' : 'event']}-Analysen`}
          </Text>
          {recentAnalyses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Eye size={48} color={Colors.gray400} />
              <Text style={styles.emptyText}>Keine Analysen vorhanden</Text>
            </View>
          ) : (
            recentAnalyses.map(renderAnalysisItem)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.gray600,
  },
  tabTextActive: {
    color: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statNumber: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  section: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  analysisCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  riskIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  analysisIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  analysisInfo: {
    flex: 1,
  },
  analysisType: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
  },
  analysisDate: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  riskBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  riskBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  scoresContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  scoreItem: {
    flex: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  patternsContainer: {
    marginBottom: Spacing.sm,
  },
  patternsLabel: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  patternsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  patternBadge: {
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  patternText: {
    fontSize: FontSizes.xs,
    color: Colors.error,
  },
  morePatterns: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    alignSelf: 'center',
  },
  actionContainer: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  actionLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  actionValue: {
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
});
