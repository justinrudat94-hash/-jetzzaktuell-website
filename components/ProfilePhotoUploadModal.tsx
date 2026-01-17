import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { X, Camera, Upload, CheckCircle2 } from 'lucide-react-native';
import { Colors } from '../constants';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';
import { supabase } from '../lib/supabase';

interface ProfilePhotoUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUploaded: () => void;
  userId: string;
  imageType: 'profile_picture' | 'banner_image';
}

export function ProfilePhotoUploadModal({
  visible,
  onClose,
  onUploaded,
  userId,
  imageType,
}: ProfilePhotoUploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleImagePick = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setSelectedImage(event.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      setError('Bild-Upload ist nur im Web verfügbar');
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      setError('Bitte wähle ein Bild aus');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const response = await fetch(selectedImage);
      const blob = await response.blob();

      const fileExt = blob.type.split('/')[1];
      const fileName = `${userId}/${imageType}_${Date.now()}.${fileExt}`;
      const filePath = `${imageType}s/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, blob, {
          contentType: blob.type,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;

      const { error: moderationError } = await supabase.functions.invoke(
        'moderate-profile-picture',
        {
          body: {
            imageUrl,
            userId,
            imageType,
          },
        }
      );

      if (moderationError) {
        console.error('Moderation error:', moderationError);
      }

      const updateField = imageType === 'profile_picture'
        ? { avatar_url: imageUrl, profile_picture_status: 'pending' }
        : { banner_image_url: imageUrl, banner_image_status: 'pending' };

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateField)
        .eq('id', userId);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        onUploaded();
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Upload');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedImage(null);
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {imageType === 'profile_picture' ? 'Profilbild hochladen' : 'Banner hochladen'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {success ? (
              <View style={styles.successContainer}>
                <CheckCircle2 size={64} color={Colors.success} />
                <Text style={styles.successTitle}>Upload erfolgreich!</Text>
                <Text style={styles.successText}>
                  Dein Bild wird jetzt geprüft und erscheint in Kürze in deinem Profil.
                </Text>
              </View>
            ) : (
              <>
                {selectedImage ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.changeImageButton}
                      onPress={handleImagePick}
                    >
                      <Camera size={20} color={Colors.white} />
                      <Text style={styles.changeImageText}>Bild ändern</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadArea}
                    onPress={handleImagePick}
                  >
                    <Upload size={48} color={Colors.primary} />
                    <Text style={styles.uploadText}>Bild auswählen</Text>
                    <Text style={styles.uploadHint}>
                      {imageType === 'profile_picture'
                        ? 'Empfohlen: Quadratisches Bild (z.B. 500x500px)'
                        : 'Empfohlen: 16:9 Format (z.B. 1920x1080px)'}
                    </Text>
                  </TouchableOpacity>
                )}

                {error && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>Wichtige Hinweise:</Text>
                  <Text style={styles.infoText}>• Dein Bild wird automatisch geprüft</Text>
                  <Text style={styles.infoText}>
                    • Keine unangemessenen, beleidigenden oder urheberrechtlich geschützten Inhalte
                  </Text>
                  <Text style={styles.infoText}>
                    • Die Prüfung dauert in der Regel weniger als 1 Minute
                  </Text>
                  <Text style={styles.infoText}>
                    • Bei Ablehnung erhältst du eine E-Mail mit Begründung
                  </Text>
                </View>
              </>
            )}
          </View>

          {!success && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={uploading}
              >
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.uploadButton,
                  (!selectedImage || uploading) && styles.uploadButtonDisabled,
                ]}
                onPress={handleUpload}
                disabled={!selectedImage || uploading}
              >
                {uploading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Upload size={20} color={Colors.white} />
                    <Text style={styles.uploadButtonText}>Hochladen</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  successTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.success,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  successText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: BorderRadius.lg,
    resizeMode: 'cover',
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  changeImageText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  uploadArea: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.xxl * 2,
    marginBottom: Spacing.lg,
  },
  uploadText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginTop: Spacing.lg,
  },
  uploadHint: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginTop: Spacing.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  errorBanner: {
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: FontSizes.md,
    color: Colors.error,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: Colors.gray100,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  infoTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  cancelButton: {
    backgroundColor: Colors.gray200,
  },
  cancelButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  uploadButton: {
    backgroundColor: Colors.primary,
  },
  uploadButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  uploadButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
});
