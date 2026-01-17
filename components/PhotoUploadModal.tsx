import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  Image,
  ScrollView,
} from 'react-native';
import { X, Camera, Image as ImageIcon, Upload, Trash2, Plus } from 'lucide-react-native';

interface PhotoUploadModalProps {
  visible: boolean;
  onClose: () => void;
  event: {
    id: number;
    title: string;
    startTime?: string;
    endTime?: string;
  };
}

interface UploadedPhoto {
  id: string;
  uri: string;
  caption: string;
}

export default function PhotoUploadModal({ visible, onClose, event }: PhotoUploadModalProps) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [currentCaption, setCurrentCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Check if photo upload is allowed based on event times
  const isPhotoUploadAllowed = () => {
    if (!event.startTime) return false;
    
    const now = new Date();
    const eventStart = new Date(event.startTime);
    const eventEnd = event.endTime ? new Date(event.endTime) : new Date(eventStart.getTime() + 24 * 60 * 60 * 1000);
    
    // Allow photo upload 24 hours before event start until 24 hours after event end
    const uploadStart = new Date(eventStart.getTime() - 24 * 60 * 60 * 1000);
    const uploadEnd = new Date(eventEnd.getTime() + 24 * 60 * 60 * 1000);
    
    return now >= uploadStart && now <= uploadEnd;
  };

  const getPhotoUploadTimeInfo = () => {
    if (!event.startTime) return 'Event-Zeit nicht verfügbar';
    
    const eventStart = new Date(event.startTime);
    const eventEnd = event.endTime ? new Date(event.endTime) : new Date(eventStart.getTime() + 24 * 60 * 60 * 1000);
    
    const uploadStart = new Date(eventStart.getTime() - 24 * 60 * 60 * 1000);
    const uploadEnd = new Date(eventEnd.getTime() + 24 * 60 * 60 * 1000);
    
    const formatDateTime = (date: Date) => {
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    
    return `${formatDateTime(uploadStart)} - ${formatDateTime(uploadEnd)}`;
  };

  const handleTakePhoto = () => {
    // Check if photo upload is allowed at this time
    if (!isPhotoUploadAllowed()) {
      Alert.alert(
        'Foto-Upload nicht verfügbar',
        `Foto-Upload ist nur in einem bestimmten Zeitraum möglich:\n\n📅 Erlaubte Zeit:\n${getPhotoUploadTimeInfo()}\n\n⏰ Foto-Upload ist 24 Stunden vor bis 24 Stunden nach dem Event möglich.`,
        [{ text: 'Verstanden', style: 'default' }]
      );
      return;
    }

    takePhotoWithCamera();
  };

  const handleSelectFromGallery = () => {
    // Check if photo upload is allowed at this time
    if (!isPhotoUploadAllowed()) {
      Alert.alert(
        'Foto-Upload nicht verfügbar',
        `Foto-Upload ist nur in einem bestimmten Zeitraum möglich:\n\n📅 Erlaubte Zeit:\n${getPhotoUploadTimeInfo()}\n\n⏰ Foto-Upload ist 24 Stunden vor bis 24 Stunden nach dem Event möglich.`,
        [{ text: 'Verstanden', style: 'default' }]
      );
      return;
    }

    selectFromGallery();
  };

  const takePhotoWithCamera = async () => {
    try {
      // Simuliere Foto aufnehmen für Web-Kompatibilität
      const mockImageUri = 'https://images.pexels.com/photos/976866/pexels-photo-976866.jpeg';
      addPhotoToList(mockImageUri, currentCaption || 'Live vom Event!');
      setCurrentCaption('');
      
      Alert.alert(
        'Foto aufgenommen! 📸',
        'Demo-Foto wurde hinzugefügt.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Fehler', 'Foto konnte nicht aufgenommen werden.');
    }
  };

  const selectFromGallery = async () => {
    try {
      // Simuliere Galerie-Auswahl für Web-Kompatibilität
      const mockImageUri = 'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg';
      addPhotoToList(mockImageUri, currentCaption || 'Aus der Galerie');
      setCurrentCaption('');
      
      Alert.alert(
        'Foto ausgewählt! 🖼️',
        'Demo-Foto wurde hinzugefügt.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Fehler', 'Foto konnte nicht ausgewählt werden.');
    }
  };

  const compressImage = async (uri: string): Promise<string> => {
    // Simuliere Komprimierung für Web-Kompatibilität
    console.log('📸 Bild komprimiert (simuliert):', uri);
    return uri;
  };

  const addPhotoToList = (uri: string, caption: string) => {
    const newPhoto: UploadedPhoto = {
      id: Date.now().toString(),
      uri,
      caption,
    };
    
    setPhotos(prev => [...prev, newPhoto]);
  };

  const handleUploadPhotos = async () => {
    if (!isPhotoUploadAllowed()) {
      Alert.alert(
        'Foto-Upload nicht verfügbar',
        `Foto-Upload ist nur in einem bestimmten Zeitraum möglich:\n\n📅 Erlaubte Zeit:\n${getPhotoUploadTimeInfo()}\n\n⏰ Foto-Upload ist 24 Stunden vor bis 24 Stunden nach dem Event möglich.`,
        [{ text: 'Verstanden', style: 'default' }]
      );
      return;
    }

    if (photos.length === 0) {
      Alert.alert('Keine Fotos', 'Bitte füge mindestens ein Foto hinzu.');
      return;
    }

    setIsUploading(true);
    
    // Simulate upload process
    setTimeout(() => {
      setIsUploading(false);
      Alert.alert(
        'Upload erfolgreich!',
        `${photos.length} Foto(s) wurden zur Event-Galerie hinzugefügt.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setPhotos([]);
              onClose();
            },
          },
        ]
      );
    }, 2000);
  };

  const handleDeletePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  const updatePhotoCaption = (photoId: string, caption: string) => {
    setPhotos(prev => 
      prev.map(photo => 
        photo.id === photoId ? { ...photo, caption } : photo
      )
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fotos hochladen</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventSubtitle}>Teile deine Event-Momente</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Time Restriction Info */}
          {!isPhotoUploadAllowed() && (
            <View style={styles.restrictionNotice}>
              <Text style={styles.restrictionTitle}>⏰ Foto-Upload nicht verfügbar</Text>
              <Text style={styles.restrictionText}>
                Foto-Upload ist nur in einem bestimmten Zeitraum möglich:
              </Text>
              <Text style={styles.restrictionTimeText}>
                📅 {getPhotoUploadTimeInfo()}
              </Text>
              <Text style={styles.restrictionSubtext}>
                (24h vor bis 24h nach dem Event)
              </Text>
            </View>
          )}

          {/* Caption Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bildunterschrift (optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Beschreibe dein Foto..."
              value={currentCaption}
              onChangeText={setCurrentCaption}
              maxLength={200}
              multiline
              editable={isPhotoUploadAllowed()}
            />
          </View>

          {/* Photo Actions */}
          <View style={styles.photoActions}>
            <TouchableOpacity
              style={[
                styles.photoActionButton,
                !isPhotoUploadAllowed() && styles.photoActionButtonDisabled
              ]}
              onPress={handleTakePhoto}
              disabled={!isPhotoUploadAllowed()}
            >
              <Camera size={24} color="#FFFFFF" />
              <Text style={styles.photoActionText}>
                {isPhotoUploadAllowed() ? 'Foto aufnehmen' : 'Aktuell nicht verfügbar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.photoActionButton, 
                styles.galleryButton,
                !isPhotoUploadAllowed() && styles.galleryButtonDisabled
              ]}
              onPress={handleSelectFromGallery}
              disabled={!isPhotoUploadAllowed()}
            >
              <ImageIcon size={24} color={isPhotoUploadAllowed() ? "#8B5CF6" : "#9CA3AF"} />
              <Text style={[styles.photoActionText, styles.galleryButtonText]}>
                {isPhotoUploadAllowed() ? 'Aus Galerie' : 'Aktuell nicht verfügbar'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Uploaded Photos */}
          {photos.length > 0 && (
            <View style={styles.photosSection}>
              <Text style={styles.sectionTitle}>
                {`Deine Fotos (${photos.length})`}
              </Text>
              
              {photos.map((photo) => (
                <View key={photo.id} style={styles.photoItem}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                  <View style={styles.photoContent}>
                    <TextInput
                      style={styles.photoCaptionInput}
                      placeholder="Bildunterschrift..."
                      value={photo.caption}
                      onChangeText={(text) => updatePhotoCaption(photo.id, text)}
                      maxLength={200}
                      multiline
                    />
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeletePhoto(photo.id)}
                    >
                      <Trash2 size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Upload Button */}
          {photos.length > 0 && (
            <TouchableOpacity
              style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
              onPress={handleUploadPhotos}
              disabled={isUploading}
            >
              <Upload size={24} color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>
                {isUploading ? 'Wird hochgeladen...' : `${photos.length} Foto(s) hochladen`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>📸 Foto-Tipps:</Text>
            <Text style={styles.tipText}>• Bilder werden automatisch komprimiert</Text>
            <Text style={styles.tipText}>• Maximale Breite: 1200px, 70% Qualität</Text>
            <Text style={styles.tipText}>• Teile die besten Momente vom Event</Text>
            <Text style={styles.tipText}>• Achte auf gute Beleuchtung</Text>
            <Text style={styles.tipText}>• Respektiere die Privatsphäre anderer</Text>
            <Text style={styles.tipText}>• Keine unangemessenen Inhalte</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerRight: {
    width: 32,
  },
  eventInfo: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  eventSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  photoActionButton: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  galleryButton: {
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  photoActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  galleryButtonText: {
    color: '#8B5CF6',
  },
  photoActionButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  galleryButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#9CA3AF',
  },
  restrictionNotice: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  restrictionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
  },
  restrictionText: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 8,
    lineHeight: 20,
  },
  restrictionTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  restrictionSubtext: {
    fontSize: 12,
    color: '#92400E',
    fontStyle: 'italic',
  },
  photosSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  photoItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  photoImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    resizeMode: 'cover',
  },
  photoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  photoCaptionInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 40,
    textAlignVertical: 'top',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  uploadButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  uploadButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  uploadButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tipsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
});