import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Colors, Spacing,  FontSizes,  FontWeights,  BorderRadius } from '../../constants';
import { router } from 'expo-router';
import { ArrowLeft, Mail, Lock, Shield, Eye, Bell, Globe, Trash2, Download, ChevronRight, X, AlertTriangle, Crown, FileText, Scale } from 'lucide-react-native';
import { useAuth } from '../../utils/authContext';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage } from '../../utils/i18n';
import { useNotifications } from '../../utils/notificationContext';

export default function SettingsScreen() {
  const { user, profile, signOut } = useAuth();
  const { t } = useTranslation();
  const { preferences, updatePreferences } = useNotifications();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());
  const [privacy, setPrivacy] = useState({
    publicProfile: true,
    showEvents: true,
  });
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleChangeEmail = () => {
    console.log('Change Email clicked');
    setNewEmail('');
    setEmailError('');
    setShowEmailModal(true);
  };

  const confirmChangeEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      setEmailError('Bitte gib eine gültige E-Mail-Adresse ein');
      return;
    }

    if (newEmail === user?.email) {
      setEmailError('Die neue E-Mail ist identisch mit der aktuellen');
      return;
    }

    setIsUpdatingEmail(true);
    setEmailError('');

    try {
      console.log('Updating email to:', newEmail);

      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) {
        console.error('Email update error:', error);
        throw error;
      }

      console.log('Email update initiated. Check your inbox for verification.');
      setShowEmailModal(false);
      setNewEmail('');
    } catch (error: any) {
      console.error('Error updating email:', error);
      setEmailError(error.message || 'E-Mail konnte nicht geändert werden');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleChangePassword = () => {
    console.log('Change Password clicked');
    router.push('/profile/change-password');
  };

  const handleEnable2FA = () => {
    console.log('2FA clicked');
    router.push('/profile/two-factor');
  };

  const handleDownloadData = () => {
    console.log('Download Data clicked');
  };

  const handleDeleteAccount = () => {
    console.log('Delete account button clicked');
    setShowDeleteWarning(true);
  };

  const confirmDeleteAccount = async () => {
    if (deleteConfirmText !== 'LÖSCHEN') {
      console.log('Wrong confirmation text:', deleteConfirmText);
      return;
    }

    console.log('Starting account deletion...');
    setIsDeleting(true);

    try {
      if (!user) {
        console.error('No user found');
        throw new Error('Kein User gefunden');
      }

      // Check for active subscription and cancel it first
      console.log('Checking for active subscriptions...');
      const { data: cancelResult, error: cancelError } = await supabase.functions.invoke(
        'cancel-subscription-on-account-deletion',
        {
          body: { userId: user.id },
        }
      );

      if (cancelError) {
        console.error('Error canceling subscription:', cancelError);
        throw new Error('Fehler beim Kündigen des Abonnements');
      }

      if (cancelResult?.hadSubscription) {
        console.log('Subscription canceled:', cancelResult.subscriptionId);
      } else {
        console.log('No active subscription found');
      }

      console.log('Calling delete_user_account RPC for user:', user.id);
      const { error: deleteError } = await supabase.rpc('delete_user_account');

      if (deleteError) {
        console.error('Delete RPC error:', deleteError);
        throw deleteError;
      }

      console.log('Account deleted successfully, signing out...');
      await signOut();
      router.replace('/auth/welcome');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setIsDeleting(false);
      setShowDeleteModal(false);
      setShowDeleteWarning(false);
      setDeleteConfirmText('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Einstellungen</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account & Sicherheit</Text>

          <TouchableOpacity style={styles.listItem} onPress={handleChangeEmail}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <Mail size={20} color={Colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>E-Mail ändern</Text>
                <Text style={styles.listItemSubtext}>{user?.email || 'Nicht verfügbar'}</Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.gray400} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.listItem} onPress={handleChangePassword}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <Lock size={20} color={Colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>Passwort ändern</Text>
                <Text style={styles.listItemSubtext}>Zuletzt geändert vor 3 Monaten</Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.gray400} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.listItem} onPress={handleEnable2FA}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <Shield size={20} color={Colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>2-Faktor-Authentifizierung</Text>
                <Text style={styles.listItemSubtext}>Zusätzlicher Schutz für deinen Account</Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.gray400} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datenschutz</Text>

          <View style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <Eye size={20} color={Colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>Öffentliches Profil</Text>
                <Text style={styles.listItemSubtext}>Andere können dein Profil sehen</Text>
              </View>
            </View>
            <Switch
              value={privacy.publicProfile}
              onValueChange={(value) => setPrivacy({ ...privacy, publicProfile: value })}
              trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
              thumbColor={privacy.publicProfile ? Colors.primary : Colors.gray500}
            />
          </View>

          <View style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <Eye size={20} color={Colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>Events anzeigen</Text>
                <Text style={styles.listItemSubtext}>Andere sehen deine erstellten Events</Text>
              </View>
            </View>
            <Switch
              value={privacy.showEvents}
              onValueChange={(value) => setPrivacy({ ...privacy, showEvents: value })}
              trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
              thumbColor={privacy.showEvents ? Colors.primary : Colors.gray500}
            />
          </View>

          <TouchableOpacity style={styles.listItem} onPress={handleDownloadData}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <Download size={20} color={Colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>Meine Daten herunterladen</Text>
                <Text style={styles.listItemSubtext}>GDPR-konforme Datenauskunft</Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.gray400} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Benachrichtigungen</Text>

          <View style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <Bell size={20} color={Colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>Alle Benachrichtigungen</Text>
                <Text style={styles.listItemSubtext}>Master-Schalter für alle Benachrichtigungen</Text>
              </View>
            </View>
            <Switch
              value={preferences?.all_notifications_enabled ?? true}
              onValueChange={(value) => updatePreferences({ all_notifications_enabled: value })}
              trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
              thumbColor={preferences?.all_notifications_enabled ? Colors.primary : Colors.gray500}
            />
          </View>

          <View style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <Bell size={20} color={Colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>Neuer Follower</Text>
                <Text style={styles.listItemSubtext}>Benachrichtigung bei neuen Followern</Text>
              </View>
            </View>
            <Switch
              value={preferences?.new_follower_enabled ?? true}
              onValueChange={(value) => updatePreferences({ new_follower_enabled: value })}
              trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
              thumbColor={preferences?.new_follower_enabled ? Colors.primary : Colors.gray500}
              disabled={!preferences?.all_notifications_enabled}
            />
          </View>

          <View style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <Bell size={20} color={Colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>Event geliked</Text>
                <Text style={styles.listItemSubtext}>Benachrichtigung bei Likes auf deine Events</Text>
              </View>
            </View>
            <Switch
              value={preferences?.event_liked_enabled ?? false}
              onValueChange={(value) => updatePreferences({ event_liked_enabled: value })}
              trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
              thumbColor={preferences?.event_liked_enabled ? Colors.primary : Colors.gray500}
              disabled={!preferences?.all_notifications_enabled}
            />
          </View>

          <View style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <Bell size={20} color={Colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>Neuer Kommentar</Text>
                <Text style={styles.listItemSubtext}>Benachrichtigung bei Kommentaren auf Events</Text>
              </View>
            </View>
            <Switch
              value={preferences?.event_comment_enabled ?? true}
              onValueChange={(value) => updatePreferences({ event_comment_enabled: value })}
              trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
              thumbColor={preferences?.event_comment_enabled ? Colors.primary : Colors.gray500}
              disabled={!preferences?.all_notifications_enabled}
            />
          </View>

          <View style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <Bell size={20} color={Colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>Kommentar-Antwort</Text>
                <Text style={styles.listItemSubtext}>Benachrichtigung bei Antworten auf Kommentare</Text>
              </View>
            </View>
            <Switch
              value={preferences?.comment_reply_enabled ?? true}
              onValueChange={(value) => updatePreferences({ comment_reply_enabled: value })}
              trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
              thumbColor={preferences?.comment_reply_enabled ? Colors.primary : Colors.gray500}
              disabled={!preferences?.all_notifications_enabled}
            />
          </View>

          <View style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <Bell size={20} color={Colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>Event-Änderungen</Text>
                <Text style={styles.listItemSubtext}>Benachrichtigung bei Änderungen an Events</Text>
              </View>
            </View>
            <Switch
              value={preferences?.event_updated_enabled ?? true}
              onValueChange={(value) => updatePreferences({ event_updated_enabled: value })}
              trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
              thumbColor={preferences?.event_updated_enabled ? Colors.primary : Colors.gray500}
              disabled={!preferences?.all_notifications_enabled}
            />
          </View>

          <View style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <Bell size={20} color={Colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>Event abgesagt</Text>
                <Text style={styles.listItemSubtext}>Benachrichtigung wenn Event abgesagt wird</Text>
              </View>
            </View>
            <Switch
              value={preferences?.event_cancelled_enabled ?? true}
              onValueChange={(value) => updatePreferences({ event_cancelled_enabled: value })}
              trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
              thumbColor={preferences?.event_cancelled_enabled ? Colors.primary : Colors.gray500}
              disabled={!preferences?.all_notifications_enabled}
            />
          </View>

          <View style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <Bell size={20} color={Colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>Event ist Live</Text>
                <Text style={styles.listItemSubtext}>Benachrichtigung wenn Livestream startet</Text>
              </View>
            </View>
            <Switch
              value={preferences?.event_live_enabled ?? true}
              onValueChange={(value) => updatePreferences({ event_live_enabled: value })}
              trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
              thumbColor={preferences?.event_live_enabled ? Colors.primary : Colors.gray500}
              disabled={!preferences?.all_notifications_enabled}
            />
          </View>

          <View style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <Bell size={20} color={Colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>Auszahlung abgeschlossen</Text>
                <Text style={styles.listItemSubtext}>Benachrichtigung bei erfolgreicher Auszahlung</Text>
              </View>
            </View>
            <Switch
              value={preferences?.payout_completed_enabled ?? true}
              onValueChange={(value) => updatePreferences({ payout_completed_enabled: value })}
              trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
              thumbColor={preferences?.payout_completed_enabled ? Colors.primary : Colors.gray500}
              disabled={!preferences?.all_notifications_enabled}
            />
          </View>

        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium & Abos</Text>

          <TouchableOpacity style={styles.listItem} onPress={() => router.push('/subscription-management' as any)}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <Crown size={20} color={Colors.accent} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>Abo-Verwaltung</Text>
                <Text style={styles.listItemSubtext}>Premium-Abo verwalten und kündigen</Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.gray400} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rechtliches</Text>

          <TouchableOpacity style={styles.listItem} onPress={() => router.push('/legal/impressum' as any)}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <FileText size={20} color={Colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>Impressum</Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.gray400} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.listItem} onPress={() => router.push('/legal/agb' as any)}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <FileText size={20} color={Colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>AGB</Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.gray400} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.listItem} onPress={() => router.push('/legal/datenschutz' as any)}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <Shield size={20} color={Colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>Datenschutzerklärung</Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.gray400} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.listItem} onPress={() => router.push('/legal/widerruf' as any)}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <Scale size={20} color={Colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>Widerrufsbelehrung</Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.gray400} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sprache & Region</Text>

          <TouchableOpacity style={styles.listItem} onPress={() => setShowLanguageModal(true)}>
            <View style={styles.listItemLeft}>
              <View style={styles.iconContainer}>
                <Globe size={20} color={Colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemText}>{t('settings.language')}</Text>
                <Text style={styles.listItemSubtext}>
                  {currentLanguage === 'de' ? 'Deutsch' : currentLanguage === 'en' ? 'English' : 'Türkçe'}
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.gray400} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>Gefahrenzone</Text>

          <TouchableOpacity style={[styles.listItem, styles.dangerItem]} onPress={handleDeleteAccount}>
            <View style={styles.listItemLeft}>
              <View style={[styles.iconContainer, styles.dangerIcon]}>
                <Trash2 size={20} color={Colors.error} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={[styles.listItemText, styles.dangerText]}>Account löschen</Text>
                <Text style={styles.listItemSubtext}>Alle Daten werden dauerhaft gelöscht</Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>App Version 1.0.0</Text>
          <Text style={styles.footerSubtext}>
            Account erstellt am {new Date(profile?.created_at || Date.now()).toLocaleDateString('de-DE')}
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showDeleteWarning}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteWarning(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowDeleteWarning(false)}
            >
              <X size={24} color={Colors.gray600} />
            </TouchableOpacity>

            <View style={styles.modalHeader}>
              <View style={styles.warningIconContainer}>
                <AlertTriangle size={48} color={Colors.error} />
              </View>
              <Text style={styles.modalTitle}>Account löschen</Text>
              <Text style={styles.modalDescription}>
                Bist du dir sicher? Diese Aktion kann nicht rückgängig gemacht werden.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDeleteWarning(false)}
              >
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  console.log('Proceeding to confirmation modal');
                  setShowDeleteWarning(false);
                  setShowDeleteModal(true);
                }}
              >
                <Text style={styles.deleteButtonText}>Weiter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => !isDeleting && setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              <X size={24} color={Colors.gray600} />
            </TouchableOpacity>

            <View style={styles.modalHeader}>
              <View style={styles.warningIconContainer}>
                <AlertTriangle size={48} color={Colors.error} />
              </View>
              <Text style={styles.modalTitle}>Account endgültig löschen?</Text>
              <Text style={styles.modalDescription}>
                Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Daten werden dauerhaft gelöscht:
              </Text>
            </View>

            <View style={styles.deleteList}>
              <Text style={styles.deleteListItem}>• Dein Profil und alle Informationen</Text>
              <Text style={styles.deleteListItem}>• Alle deine Events</Text>
              <Text style={styles.deleteListItem}>• Deine Likes und Kommentare</Text>
              <Text style={styles.deleteListItem}>• Deine Follower und Follows</Text>
              <Text style={styles.deleteListItem}>• Alle anderen Daten</Text>
            </View>

            <View style={styles.confirmSection}>
              <Text style={styles.confirmLabel}>
                Gib <Text style={styles.confirmKeyword}>LÖSCHEN</Text> ein, um fortzufahren:
              </Text>
              <TextInput
                style={styles.confirmInput}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="LÖSCHEN"
                autoCapitalize="characters"
                editable={!isDeleting}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                disabled={isDeleting}
              >
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  (deleteConfirmText !== 'LÖSCHEN' || isDeleting) && styles.deleteButtonDisabled
                ]}
                onPress={confirmDeleteAccount}
                disabled={deleteConfirmText !== 'LÖSCHEN' || isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.deleteButtonText}>Account löschen</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEmailModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isUpdatingEmail && setShowEmailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => !isUpdatingEmail && setShowEmailModal(false)}
              disabled={isUpdatingEmail}
            >
              <X size={24} color={Colors.gray600} />
            </TouchableOpacity>

            <View style={styles.modalHeader}>
              <View style={styles.iconContainer}>
                <Mail size={32} color={Colors.primary} />
              </View>
              <Text style={styles.modalTitle}>E-Mail ändern</Text>
              <Text style={styles.modalDescription}>
                Du erhältst eine Bestätigungs-E-Mail an deine neue Adresse. Klicke auf den Link in der E-Mail, um die Änderung zu bestätigen.
              </Text>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Aktuelle E-Mail:</Text>
              <Text style={styles.currentEmail}>{user?.email}</Text>

              <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>Neue E-Mail:</Text>
              <TextInput
                style={styles.emailInput}
                value={newEmail}
                onChangeText={(text) => {
                  setNewEmail(text);
                  setEmailError('');
                }}
                placeholder="neue@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isUpdatingEmail}
              />

              {emailError && (
                <Text style={styles.errorText}>{emailError}</Text>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowEmailModal(false);
                  setNewEmail('');
                  setEmailError('');
                }}
                disabled={isUpdatingEmail}
              >
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  (!newEmail || isUpdatingEmail) && styles.deleteButtonDisabled
                ]}
                onPress={confirmChangeEmail}
                disabled={!newEmail || isUpdatingEmail}
              >
                {isUpdatingEmail ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.deleteButtonText}>E-Mail ändern</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowLanguageModal(false)}
            >
              <X size={24} color={Colors.gray600} />
            </TouchableOpacity>

            <View style={styles.modalHeader}>
              <View style={styles.iconContainer}>
                <Globe size={32} color={Colors.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: Colors.gray800 }]}>{t('settings.language')}</Text>
              <Text style={styles.modalDescription}>
                Wähle deine bevorzugte Sprache
              </Text>
            </View>

            <View style={styles.languageList}>
              <TouchableOpacity
                style={[styles.languageItem, currentLanguage === 'de' && styles.languageItemActive]}
                onPress={async () => {
                  await changeLanguage('de');
                  setCurrentLanguage('de');
                  setShowLanguageModal(false);
                }}
              >
                <Text style={[styles.languageText, currentLanguage === 'de' && styles.languageTextActive]}>
                  🇩🇪 Deutsch
                </Text>
                {currentLanguage === 'de' && (
                  <View style={styles.activeIndicator} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.languageItem, currentLanguage === 'en' && styles.languageItemActive]}
                onPress={async () => {
                  await changeLanguage('en');
                  setCurrentLanguage('en');
                  setShowLanguageModal(false);
                }}
              >
                <Text style={[styles.languageText, currentLanguage === 'en' && styles.languageTextActive]}>
                  🇬🇧 English
                </Text>
                {currentLanguage === 'en' && (
                  <View style={styles.activeIndicator} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.languageItem, currentLanguage === 'tr' && styles.languageItemActive]}
                onPress={async () => {
                  await changeLanguage('tr');
                  setCurrentLanguage('tr');
                  setShowLanguageModal(false);
                }}
              >
                <Text style={[styles.languageText, currentLanguage === 'tr' && styles.languageTextActive]}>
                  🇹🇷 Türkçe
                </Text>
                {currentLanguage === 'tr' && (
                  <View style={styles.activeIndicator} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
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
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  listItemContent: {
    flex: 1,
  },
  listItemText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.gray800,
    marginBottom: 2,
  },
  listItemSubtext: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
  },
  dangerTitle: {
    color: Colors.error,
  },
  dangerItem: {
    borderWidth: 1,
    borderColor: Colors.error + '20',
  },
  dangerIcon: {
    backgroundColor: Colors.error + '10',
  },
  dangerText: {
    color: Colors.error,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  footerText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
  },
  modalClose: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.sm,
    zIndex: 1,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  warningIconContainer: {
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  modalDescription: {
    fontSize: FontSizes.md,
    color: Colors.gray700,
    textAlign: 'center',
    lineHeight: 22,
  },
  deleteList: {
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  deleteListItem: {
    fontSize: FontSizes.sm,
    color: Colors.gray800,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  confirmSection: {
    marginBottom: Spacing.lg,
  },
  confirmLabel: {
    fontSize: FontSizes.md,
    color: Colors.gray800,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  confirmKeyword: {
    fontWeight: FontWeights.bold,
    color: Colors.error,
  },
  confirmInput: {
    borderWidth: 2,
    borderColor: Colors.error,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    color: Colors.gray800,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray300,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.error,
    alignItems: 'center',
  },
  deleteButtonDisabled: {
    backgroundColor: Colors.gray400,
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  inputSection: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
  },
  currentEmail: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    marginBottom: Spacing.md,
  },
  emailInput: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSizes.md,
    color: Colors.gray800,
  },
  errorText: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  languageList: {
    gap: Spacing.sm,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageItemActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  languageText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.medium,
    color: Colors.gray700,
  },
  languageTextActive: {
    color: Colors.primary,
    fontWeight: FontWeights.bold,
  },
  activeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
});
