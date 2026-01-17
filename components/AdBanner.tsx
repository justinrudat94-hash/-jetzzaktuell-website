import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { ExternalLink, X } from 'lucide-react-native';
import { Colors } from '../constants';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';
import { getRandomCampaign, trackAdImpression, PartnerCampaign } from '../services/adService';

interface AdBannerProps {
  adType?: 'banner' | 'sponsored_event';
  placement?: string;
  category?: string;
  city?: string;
  onClose?: () => void;
  compact?: boolean;
  duration?: number;
}

export default function AdBanner({
  adType = 'banner',
  placement = 'home',
  category,
  city,
  onClose,
  compact = false,
  duration = 5,
}: AdBannerProps) {
  const [campaign, setCampaign] = useState<PartnerCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true);
  const [countdown, setCountdown] = useState(duration);

  useEffect(() => {
    loadCampaign();
  }, []);

  useEffect(() => {
    if (duration && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      handleClose();
    }
  }, [countdown, duration]);

  const loadCampaign = async () => {
    setLoading(true);

    try {
      const campaignData = await getRandomCampaign(adType, category, city);

      if (campaignData) {
        setCampaign(campaignData);
        await trackAdImpression(campaignData.id, adType, placement, false);
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = async () => {
    if (!campaign) return;

    if (campaign.ad_content?.click_url) {
      await trackAdImpression(campaign.id, adType, placement, true);
      Linking.openURL(campaign.ad_content.click_url);
    }
  };

  const handleClose = () => {
    setVisible(false);
    onClose?.();
  };

  if (!visible || loading || !campaign) {
    return null;
  }

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactBanner}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.compactContent}>
          <Text style={styles.sponsoredLabel}>Werbung {countdown > 0 ? `(${countdown}s)` : ''}</Text>
          {campaign.partner?.logo_url && (
            <Image
              source={{ uri: campaign.partner.logo_url }}
              style={styles.compactLogo}
            />
          )}
          <Text style={styles.compactTitle} numberOfLines={1}>
            {campaign.ad_content.title || campaign.partner?.company_name}
          </Text>
        </View>
        {onClose && countdown === 0 && (
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={16} color={Colors.gray600} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.banner}>
      <View style={styles.header}>
        <Text style={styles.sponsoredLabel}>Gesponsert</Text>
        {onClose && (
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={18} color={Colors.gray600} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        {campaign.ad_content.image_url && (
          <Image
            source={{ uri: campaign.ad_content.image_url }}
            style={styles.bannerImage}
          />
        )}

        <View style={styles.content}>
          <View style={styles.partnerInfo}>
            {campaign.partner?.logo_url && (
              <Image
                source={{ uri: campaign.partner.logo_url }}
                style={styles.partnerLogo}
              />
            )}
            <View style={styles.textContent}>
              <Text style={styles.title}>
                {campaign.ad_content.title || campaign.partner?.company_name}
              </Text>
              {campaign.ad_content.description && (
                <Text style={styles.description} numberOfLines={2}>
                  {campaign.ad_content.description}
                </Text>
              )}
            </View>
          </View>

          {campaign.ad_content.cta_text && (
            <View style={styles.ctaButton}>
              <Text style={styles.ctaText}>{campaign.ad_content.cta_text}</Text>
              <ExternalLink size={16} color={Colors.primary} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sponsoredLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  bannerImage: {
    width: '100%',
    height: 150,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    resizeMode: 'cover',
  },
  content: {
    gap: Spacing.md,
  },
  partnerInfo: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  partnerLogo: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    resizeMode: 'contain',
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  description: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  ctaText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  compactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  compactLogo: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    resizeMode: 'contain',
  },
  compactTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
    flex: 1,
  },
});
