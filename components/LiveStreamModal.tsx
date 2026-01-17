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
} from 'react-native';
import { X, Video, Play, Square, Users, Eye } from 'lucide-react-native';
import { ReportButton } from './ReportButton';

interface LiveStreamModalProps {
  visible: boolean;
  onClose: () => void;
  event: {
    id: number | string;
    title: string;
    user_id?: string;
  };
}

export default function LiveStreamModal({ visible, onClose, event }: LiveStreamModalProps) {
  const [streamTitle, setStreamTitle] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamDuration, setStreamDuration] = useState('00:00');
  const [hasPermission, setHasPermission] = useState(true);

  // Check if live streaming is allowed based on event times
  const isLiveStreamingAllowed = () => {
    if (!event.startTime) return false;
    
    const now = new Date();
    const eventStart = new Date(event.startTime);
    const eventEnd = event.endTime ? new Date(event.endTime) : new Date(eventStart.getTime() + 24 * 60 * 60 * 1000);
    
    // Allow streaming 24 hours before event start until 24 hours after event end
    const streamingStart = new Date(eventStart.getTime() - 24 * 60 * 60 * 1000);
    const streamingEnd = new Date(eventEnd.getTime() + 24 * 60 * 60 * 1000);
    
    return now >= streamingStart && now <= streamingEnd;
  };

  const getStreamingTimeInfo = () => {
    if (!event.startTime) return 'Event-Zeit nicht verfügbar';
    
    const eventStart = new Date(event.startTime);
    const eventEnd = event.endTime ? new Date(event.endTime) : new Date(eventStart.getTime() + 24 * 60 * 60 * 1000);
    
    const streamingStart = new Date(eventStart.getTime() - 24 * 60 * 60 * 1000);
    const streamingEnd = new Date(eventEnd.getTime() + 24 * 60 * 60 * 1000);
    
    const formatDateTime = (date: Date) => {
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    
    return `${formatDateTime(streamingStart)} - ${formatDateTime(streamingEnd)}`;
  };

  const handleStartStream = () => {
    // Check if streaming is allowed at this time
    if (!isLiveStreamingAllowed()) {
      Alert.alert(
        'Live-Stream nicht verfügbar',
        `Live-Streaming ist nur in einem bestimmten Zeitraum möglich:\n\n📅 Erlaubte Zeit:\n${getStreamingTimeInfo()}\n\n⏰ Live-Streaming ist 24 Stunden vor bis 24 Stunden nach dem Event möglich.`,
        [{ text: 'Verstanden', style: 'default' }]
      );
      return;
    }

    if (!streamTitle.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Titel für deinen Stream ein.');
      return;
    }

    if (!hasPermission) {
      Alert.alert(
        'Kamera-Berechtigung erforderlich',
        'Um live zu streamen, benötigen wir Zugriff auf deine Kamera.',
        [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Berechtigung erteilen', onPress: () => setHasPermission(true) },
        ]
      );
      return;
    }

    setShowCamera(true);
    setIsStreaming(true);
    // Simulate viewer count updates
    const interval = setInterval(() => {
      setViewerCount(prev => prev + Math.floor(Math.random() * 3));
    }, 5000);

    // Simulate duration updates
    let seconds = 0;
    const durationInterval = setInterval(() => {
      seconds++;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      setStreamDuration(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }, 1000);

    Alert.alert(
      'Stream gestartet!',
      'Dein Live-Stream ist jetzt aktiv. Andere Nutzer können ihn sehen.',
      [{ text: 'OK' }]
    );
  };

  const handleStopStream = () => {
    Alert.alert(
      'Stream beenden?',
      'Möchtest du deinen Live-Stream wirklich beenden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Beenden',
          style: 'destructive',
          onPress: () => {
            setShowCamera(false);
            setIsStreaming(false);
            setViewerCount(0);
            setStreamDuration('00:00');
            Alert.alert('Stream beendet', 'Dein Live-Stream wurde beendet.');
          },
        },
      ]
    );
  };

  const handleClose = () => {
    if (isStreaming) {
      Alert.alert(
        'Stream läuft noch',
        'Du hast einen aktiven Stream. Möchtest du ihn beenden?',
        [
          { text: 'Weiterlaufen lassen', onPress: onClose },
          {
            text: 'Stream beenden',
            style: 'destructive',
            onPress: () => {
              setShowCamera(false);
              setIsStreaming(false);
              setViewerCount(0);
              setStreamDuration('00:00');
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  const toggleCameraFacing = () => {
    // Simuliere Kamera-Wechsel für Web-Kompatibilität
    Alert.alert('Kamera gewechselt', 'Kamera-Ansicht wurde gewechselt (simuliert)');
  };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Live-Stream</Text>
          <View style={styles.headerRight}>
            {event.user_id && (
              <ReportButton
                entityType="livestream"
                entityId={typeof event.id === 'string' ? event.id : String(event.id)}
                entityOwnerId={event.user_id}
                entityTitle={event.title}
                size={20}
                color="#1F2937"
              />
            )}
          </View>
        </View>

        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventSubtitle}>Live-Stream starten</Text>
        </View>

        {/* Stream Setup */}
        {!isStreaming && !showCamera && (
          <View style={styles.setupContainer}>
            {/* Time Restriction Info */}
            {!isLiveStreamingAllowed() && (
              <View style={styles.restrictionNotice}>
                <Text style={styles.restrictionTitle}>⏰ Live-Streaming nicht verfügbar</Text>
                <Text style={styles.restrictionText}>
                  Live-Streaming ist nur in einem bestimmten Zeitraum möglich:
                </Text>
                <Text style={styles.restrictionTimeText}>
                  📅 {getStreamingTimeInfo()}
                </Text>
                <Text style={styles.restrictionSubtext}>
                  (24h vor bis 24h nach dem Event)
                </Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Stream-Titel</Text>
              <TextInput
                style={styles.textInput}
                placeholder="z.B. Live vom Stadtfest!"
                value={streamTitle}
                onChangeText={setStreamTitle}
                maxLength={100}
                editable={isLiveStreamingAllowed()}
              />
              <Text style={styles.inputHint}>
                Beschreibe kurz, was du streamst
              </Text>
            </View>

            <View style={styles.cameraPreview}>
              <Video size={48} color="#8B5CF6" />
              <Text style={styles.previewText}>Kamera-Vorschau</Text>
              <Text style={styles.previewSubtext}>
                Stelle sicher, dass deine Kamera funktioniert
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.startButton,
                !isLiveStreamingAllowed() && styles.startButtonDisabled
              ]}
              onPress={handleStartStream}
              disabled={!isLiveStreamingAllowed()}
            >
              <Play size={24} color="#FFFFFF" />
              <Text style={styles.startButtonText}>
                {isLiveStreamingAllowed() ? 'Live-Stream starten' : 'Aktuell nicht verfügbar'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Active Stream */}
        {isStreaming && showCamera && (
          <View style={styles.streamContainer}>
            {/* Live Camera View */}
            <View style={styles.cameraContainer}>
              <View style={styles.camera}>
                <View style={styles.cameraPlaceholder}>
                  <Video size={48} color="#FFFFFF" />
                  <Text style={styles.cameraPlaceholderText}>Live-Kamera</Text>
                  <Text style={styles.cameraPlaceholderSubtext}>Simuliert für Web</Text>
                </View>
                
                <View style={styles.cameraOverlay}>
                  <View style={styles.liveIndicatorLarge}>
                    <Text style={styles.liveTextLarge}>🔴 LIVE</Text>
                  </View>
                  
                  <View style={styles.streamInfo}>
                    <Text style={styles.streamTitleOverlay}>{streamTitle}</Text>
                    <View style={styles.streamStatsOverlay}>
                      <View style={styles.statItemOverlay}>
                        <Eye size={16} color="#FFFFFF" />
                        <Text style={styles.statTextOverlay}>{viewerCount}</Text>
                      </View>
                      <View style={styles.statItemOverlay}>
                        <Video size={16} color="#FFFFFF" />
                        <Text style={styles.statTextOverlay}>{streamDuration}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.cameraControls}>
                    <TouchableOpacity 
                      style={styles.flipButton}
                      onPress={toggleCameraFacing}
                    >
                      <Text style={styles.flipButtonText}>📷</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.stopStreamButton}
                      onPress={handleStopStream}
                    >
                      <Square size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Stream Stats (when streaming but camera hidden) */}
        {isStreaming && !showCamera && (
          <View style={styles.streamContainer}>
            <View style={styles.streamHeader}>
              <View style={styles.liveIndicator}>
                <Text style={styles.liveText}>🔴 LIVE</Text>
              </View>
              <Text style={styles.streamTitleActive}>{streamTitle}</Text>
            </View>

            <View style={styles.streamStats}>
              <View style={styles.statItem}>
                <Eye size={20} color="#10B981" />
                <Text style={styles.statText}>{`${viewerCount} Zuschauer`}</Text>
              </View>
              <View style={styles.statItem}>
                <Video size={20} color="#8B5CF6" />
                <Text style={styles.statText}>{streamDuration}</Text>
              </View>
            </View>

            <View style={styles.streamPreview}>
              <Text style={styles.streamPreviewText}>📹 Du streamst live!</Text>
              <Text style={styles.streamPreviewSubtext}>
                Andere Nutzer können deinen Stream jetzt sehen
              </Text>
            </View>

            <TouchableOpacity
              style={styles.stopButton}
              onPress={handleStopStream}
            >
              <Square size={24} color="#FFFFFF" />
              <Text style={styles.stopButtonText}>Stream beenden</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Tipps für einen guten Stream:</Text>
          <Text style={styles.tipText}>• Halte dein Handy stabil</Text>
          <Text style={styles.tipText}>• Achte auf gute Beleuchtung</Text>
          <Text style={styles.tipText}>• Kommentiere was du siehst</Text>
          <Text style={styles.tipText}>• Interagiere mit den Zuschauern</Text>
        </View>
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
  setupContainer: {
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
  },
  inputHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  cameraPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  previewText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
  },
  previewSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  startButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  startButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
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
  streamContainer: {
    flex: 1,
    padding: 20,
  },
  streamHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  liveIndicator: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  liveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  streamTitleActive: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  streamEventInfo: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  streamStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  streamPreview: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  streamPreviewText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  streamPreviewSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 16,
  },
  cameraPreviewBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
  },
  cameraPreviewText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
  },
  cameraPreviewSubtext: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 4,
  },
  stopButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  stopButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tipsContainer: {
    backgroundColor: '#FFFFFF',
    margin: 20,
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
  cameraContainer: {
    height: 400,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  camera: {
    flex: 1,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraPlaceholderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
  },
  cameraPlaceholderSubtext: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 4,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    padding: 20,
    justifyContent: 'space-between',
  },
  liveIndicatorLarge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  liveTextLarge: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  streamInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
    borderRadius: 12,
  },
  streamTitleOverlay: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  streamStatsOverlay: {
    flexDirection: 'row',
    gap: 16,
  },
  statItemOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statTextOverlay: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flipButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButtonText: {
    fontSize: 20,
  },
  stopStreamButton: {
    backgroundColor: '#EF4444',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});