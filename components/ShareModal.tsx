import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Share as RNShare,
  Platform,
  Linking,
} from 'react-native';
import { Colors, Spacing,  BorderRadius,  FontSizes,  FontWeights } from '../constants';
import { Share, X, MessageCircle, Instagram, Facebook, Twitter, Link as LinkIcon } from 'lucide-react-native';
import { Event, ShareOption } from '../types';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  event: Event | any;
}

export default function ShareModal({ visible, onClose, event }: ShareModalProps) {
  const eventUrl = `https://jetzz.app/event/${event.id}`;
  const shareText = `Schau dir dieses Event an: ${event.title} am ${event.time} in ${event.location}`;

  const handleNativeShare = async () => {
    try {
      const result = await RNShare.share({
        message: shareText,
        url: eventUrl,
        title: event.title,
      });

      if (result.action === RNShare.sharedAction) {
        onClose();
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Fehler', 'Event konnte nicht geteilt werden.');
    }
  };

  const copyToClipboard = async () => {
    try {
      if (Platform.OS === 'web') {
        if (navigator?.clipboard) {
          await navigator.clipboard.writeText(shareText + '\n' + eventUrl);
          Alert.alert('Kopiert!', 'Event-Link wurde in die Zwischenablage kopiert.');
        }
      } else {
        await handleNativeShare();
      }
    } catch (error) {
      Alert.alert('Fehler', 'Link konnte nicht kopiert werden.');
    }
    onClose();
  };

  const shareOptions: ShareOption[] = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: '#25D366',
      onPress: async () => {
        try {
          const whatsappUrl = Platform.OS === 'web'
            ? `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + eventUrl)}`
            : `whatsapp://send?text=${encodeURIComponent(shareText + '\n' + eventUrl)}`;

          const canOpen = await Linking.canOpenURL(whatsappUrl);
          if (canOpen) {
            await Linking.openURL(whatsappUrl);
            onClose();
          } else {
            Alert.alert('WhatsApp nicht verfügbar', 'Bitte installiere WhatsApp, um Events zu teilen.');
          }
        } catch (error) {
          Alert.alert('Fehler', 'WhatsApp konnte nicht geöffnet werden.');
        }
      },
    },
    {
      name: 'Instagram',
      icon: Instagram,
      color: '#E4405F',
      onPress: async () => {
        try {
          if (Platform.OS === 'web') {
            if (navigator?.clipboard) {
              await navigator.clipboard.writeText(shareText + '\n' + eventUrl);
            }
          }
          Alert.alert(
            'Link kopiert!',
            'Instagram erlaubt kein direktes Teilen. Der Link wurde in die Zwischenablage kopiert.\n\nÖffne Instagram und füge den Link in deine Story oder als Kommentar ein.'
          );
          onClose();
        } catch (error) {
          Alert.alert('Fehler', 'Link konnte nicht kopiert werden.');
        }
      },
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: '#1877F2',
      onPress: async () => {
        try {
          const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`;
          const canOpen = await Linking.canOpenURL(facebookUrl);
          if (canOpen) {
            await Linking.openURL(facebookUrl);
            onClose();
          }
        } catch (error) {
          Alert.alert('Fehler', 'Facebook konnte nicht geöffnet werden.');
        }
      },
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: '#1DA1F2',
      onPress: async () => {
        try {
          const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(eventUrl)}`;
          const canOpen = await Linking.canOpenURL(twitterUrl);
          if (canOpen) {
            await Linking.openURL(twitterUrl);
            onClose();
          }
        } catch (error) {
          Alert.alert('Fehler', 'Twitter konnte nicht geöffnet werden.');
        }
      },
    },
    {
      name: 'Link kopieren',
      icon: LinkIcon,
      color: Colors.gray600,
      onPress: copyToClipboard,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Event teilen</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.gray600} />
            </TouchableOpacity>
          </View>

          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {event.title}
            </Text>
            <Text style={styles.eventDetails}>
              {event.time} • {event.location}
            </Text>
          </View>

          <View style={styles.shareOptions}>
            {shareOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.shareOption}
                onPress={option.onPress}
              >
                <View style={[styles.shareIcon, { backgroundColor: option.color }]}>
                  <option.icon size={24} color={Colors.white} />
                </View>
                <Text style={styles.shareOptionText}>{option.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingBottom: Spacing.huge,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
  },
  closeButton: {
    padding: 4,
  },
  eventInfo: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  eventTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray800,
    marginBottom: 4,
  },
  eventDetails: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  shareOptions: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  shareIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareOptionText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray800,
  },
});