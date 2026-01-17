import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { X } from 'lucide-react-native';

interface EventGalleryModalProps {
  visible: boolean;
  onClose: () => void;
  images: string[];
}

const { width: screenWidth } = Dimensions.get('window');

export default function EventGalleryModal({ visible, onClose, images }: EventGalleryModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const renderPhotoItem = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      style={styles.photoItem}
      onPress={() => setSelectedImageIndex(index)}
    >
      <Image source={{ uri: item }} style={styles.photoThumbnail} />
    </TouchableOpacity>
  );

  const renderFullScreenPhoto = () => {
    if (selectedImageIndex === null) return null;

    return (
      <Modal
        visible={selectedImageIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImageIndex(null)}
      >
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity
            style={styles.fullScreenClose}
            onPress={() => setSelectedImageIndex(null)}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Image
            source={{ uri: images[selectedImageIndex] }}
            style={[styles.fullScreenImage, { resizeMode: 'contain' }]}
          />

          <View style={styles.fullScreenInfo}>
            <Text style={styles.fullScreenImageCounter}>
              {selectedImageIndex + 1} / {images.length}
            </Text>
          </View>
        </View>
      </Modal>
    );
  };

  const photos = images || [];

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Event-Galerie</Text>
            <View style={styles.headerRight} />
          </View>

          <View style={styles.eventInfo}>
            <Text style={styles.eventSubtitle}>
              {photos.length} {photos.length === 1 ? 'Foto' : 'Fotos'}
            </Text>
          </View>

          {photos.length > 0 ? (
            <FlatList
              data={photos}
              renderItem={renderPhotoItem}
              keyExtractor={(item, index) => `photo-${index}`}
              numColumns={2}
              contentContainerStyle={styles.photosGrid}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📸</Text>
              <Text style={styles.emptyStateTitle}>Keine Fotos vorhanden</Text>
              <Text style={styles.emptyStateText}>
                Für dieses Event wurden noch keine Bilder hochgeladen.
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {renderFullScreenPhoto()}
    </>
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
  eventSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  photosGrid: {
    padding: 10,
  },
  photoItem: {
    flex: 1,
    margin: 5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  photoThumbnail: {
    width: '100%',
    height: (screenWidth - 40) / 2,
    resizeMode: 'cover',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
  },
  fullScreenClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullScreenImage: {
    width: '100%',
    height: '70%',
  },
  fullScreenInfo: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fullScreenImageCounter: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
});
