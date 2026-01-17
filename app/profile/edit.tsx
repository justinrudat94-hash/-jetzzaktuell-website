import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing,  FontSizes,  FontWeights,  BorderRadius } from '../../constants';
import { useRouter } from 'expo-router';
import { User, Camera, ChevronLeft, Save, Phone, CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '../../utils/authContext';
import { supabase } from '../../lib/supabase';
import { PhoneVerificationModal } from '../../components/PhoneVerificationModal';
import { UsernameSelector } from '../../components/UsernameSelector';
import { ProfilePhotoUploadModal } from '../../components/ProfilePhotoUploadModal';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoType, setPhotoType] = useState<'profile_picture' | 'banner_image'>('profile_picture');

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Bitte melde dich an um dein Profil zu bearbeiten</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Zurück</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const [formData, setFormData] = useState({
    name: profile?.name || '',
    bio: profile?.bio || '',
    city: profile?.city || '',
    postcode: profile?.postcode || '',
    website: profile?.website || '',
    phone_number: profile?.phone_number || '',
    show_real_name: profile?.show_real_name || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name.trim(),
          bio: formData.bio.trim(),
          city: formData.city.trim(),
          postcode: formData.postcode.trim(),
          website: formData.website.trim(),
          show_real_name: formData.show_real_name,
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setSuccessMessage('Profil erfolgreich aktualisiert!');

      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error: any) {
      setErrors({ general: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (type: 'profile_picture' | 'banner_image') => {
    setPhotoType(type);
    setShowPhotoModal(true);
  };

  const handlePhotoUploaded = async () => {
    setShowPhotoModal(false);
    await refreshProfile();
  };

  const handlePhoneVerified = async () => {
    setShowPhoneModal(false);
    await refreshProfile();
  };

  const handleUsernameSet = async () => {
    setShowUsernameModal(false);
    await refreshProfile();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil bearbeiten</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {successMessage && (
          <View style={styles.successBanner}>
            <CheckCircle2 size={20} color={Colors.success} />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        {errors.general && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errors.general}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profilbild & Banner</Text>

          <View style={styles.photoSection}>
            <View style={styles.profilePictureContainer}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.profilePicture} />
              ) : (
                <View style={styles.profilePicturePlaceholder}>
                  <User size={40} color={Colors.gray400} />
                </View>
              )}
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => handlePhotoUpload('profile_picture')}
              >
                <Camera size={16} color={Colors.white} />
              </TouchableOpacity>
            </View>
            <View style={styles.photoInfo}>
              <Text style={styles.photoLabel}>Profilbild</Text>
              <Text style={styles.photoHint}>Quadratisches Bild empfohlen</Text>
              {profile?.profile_picture_status === 'pending' && (
                <Text style={styles.moderationPending}>In Prüfung...</Text>
              )}
              {profile?.profile_picture_status === 'rejected' && (
                <Text style={styles.moderationRejected}>Abgelehnt</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => handlePhotoUpload('banner_image')}
          >
            <Camera size={20} color={Colors.primary} />
            <Text style={styles.uploadButtonText}>
              {profile?.banner_image_url ? 'Banner ändern' : 'Banner hochladen'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Grundinformationen</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="Dein Name"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.bio}
              onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
              placeholder="Erzähl etwas über dich..."
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.charCount}>{formData.bio.length}/500</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Website</Text>
            <TextInput
              style={styles.input}
              value={formData.website}
              onChangeText={(text) => setFormData(prev => ({ ...prev, website: text }))}
              placeholder="https://deine-website.de"
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datenschutz</Text>

          <View style={styles.privacyCard}>
            <View style={styles.privacyInfo}>
              <Text style={styles.privacyLabel}>Vollständigen Namen anzeigen</Text>
              <Text style={styles.privacyHint}>
                {formData.show_real_name
                  ? 'Dein vollständiger Name wird anderen Nutzern angezeigt'
                  : 'Nur dein Username und Vorname werden angezeigt (empfohlen)'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.privacyToggle,
                formData.show_real_name && styles.privacyToggleActive
              ]}
              onPress={() => setFormData(prev => ({ ...prev, show_real_name: !prev.show_real_name }))}
            >
              <View style={[
                styles.privacyToggleCircle,
                formData.show_real_name && styles.privacyToggleCircleActive
              ]} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Standort</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stadt</Text>
            <TextInput
              style={styles.input}
              value={formData.city}
              onChangeText={(text) => setFormData(prev => ({ ...prev, city: text }))}
              placeholder="München"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Postleitzahl</Text>
            <TextInput
              style={styles.input}
              value={formData.postcode}
              onChangeText={(text) => setFormData(prev => ({ ...prev, postcode: text }))}
              placeholder="12345"
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account-Informationen</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>E-Mail (nicht änderbar hier)</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
            <Text style={styles.infoHint}>
              E-Mail & Passwort können in den Einstellungen geändert werden
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Geburtsdatum</Text>
            <Text style={styles.infoValue}>
              {profile?.date_of_birth
                ? new Date(profile.date_of_birth).toLocaleDateString('de-DE')
                : 'Nicht gesetzt'}
            </Text>
            <Text style={styles.infoHint}>
              Aus Sicherheitsgründen kann das Geburtsdatum nicht geändert werden
            </Text>
          </View>

          <TouchableOpacity style={styles.verificationCard} onPress={() => setShowUsernameModal(true)}>
            <View style={styles.verificationInfo}>
              <Text style={styles.verificationLabel}>Username</Text>
              <Text style={styles.verificationValue}>@{profile?.username || 'Nicht gesetzt'}</Text>
              {profile?.username_last_changed && (
                <Text style={styles.verificationHint}>
                  Letzte Änderung: {new Date(profile.username_last_changed).toLocaleDateString('de-DE')}
                </Text>
              )}
            </View>
            <Text style={styles.changeLink}>Ändern</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.verificationCard}
            onPress={() => setShowPhoneModal(true)}
          >
            <View style={styles.verificationInfo}>
              <Text style={styles.verificationLabel}>Telefonnummer</Text>
              <View style={styles.verificationRow}>
                {profile?.phone_verified ? (
                  <>
                    <CheckCircle2 size={16} color={Colors.success} />
                    <Text style={styles.verificationValueVerified}>Verifiziert</Text>
                  </>
                ) : (
                  <Text style={styles.verificationValue}>Nicht verifiziert</Text>
                )}
              </View>
            </View>
            <Phone size={20} color={Colors.primary} />
          </TouchableOpacity>

          {profile?.id_verified && (
            <View style={styles.verificationCard}>
              <View style={styles.verificationInfo}>
                <Text style={styles.verificationLabel}>ID-Verifizierung</Text>
                <View style={styles.verificationRow}>
                  <CheckCircle2 size={16} color={Colors.success} />
                  <Text style={styles.verificationValueVerified}>Verifiziert</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Save size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Speichern</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <PhoneVerificationModal
        visible={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onVerified={handlePhoneVerified}
        userId={user.id}
      />

      <UsernameSelector
        visible={showUsernameModal}
        onClose={() => setShowUsernameModal(false)}
        currentUsername={profile?.username || ''}
        userId={user.id}
        onUsernameSet={handleUsernameSet}
      />

      <ProfilePhotoUploadModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onUploaded={handlePhotoUploaded}
        userId={user.id}
        imageType={photoType}
      />
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  photoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  profilePictureContainer: {
    position: 'relative',
    marginRight: Spacing.lg,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profilePicturePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  photoInfo: {
    flex: 1,
  },
  photoLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  photoHint: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  moderationPending: {
    fontSize: FontSizes.sm,
    color: Colors.warning,
    marginTop: 4,
  },
  moderationRejected: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    marginTop: 4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  verificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  verificationInfo: {
    flex: 1,
  },
  verificationLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginBottom: 4,
  },
  verificationValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.textPrimary,
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  verificationValueVerified: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.success,
  },
  verificationHint: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    marginTop: 4,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  privacyInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  privacyLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  privacyHint: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    lineHeight: 16,
  },
  privacyToggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.gray300,
    padding: 3,
    justifyContent: 'center',
  },
  privacyToggleActive: {
    backgroundColor: Colors.primary,
  },
  privacyToggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  privacyToggleCircleActive: {
    alignSelf: 'flex-end',
  },
  changeLink: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  infoCard: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.gray800,
    marginBottom: 4,
  },
  infoHint: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  saveButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  successText: {
    fontSize: FontSizes.md,
    color: Colors.success,
    fontWeight: FontWeights.medium,
  },
  errorBanner: {
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  errorText: {
    fontSize: FontSizes.md,
    color: Colors.error,
  },
});
