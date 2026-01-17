import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { X, MapPin, Calendar, DollarSign, ExternalLink, CheckCircle, AlertCircle, XCircle } from 'lucide-react-native';
import { Colors } from '../constants';
import { Spacing } from '../constants';
import { EventPreview } from '../services/eventPreviewService';

interface EventPreviewModalProps {
  visible: boolean;
  event: EventPreview | null;
  onClose: () => void;
  onToggleSelection: (eventId: string) => void;
  isSelected: boolean;
}

export function EventPreviewModal({
  visible,
  event,
  onClose,
  onToggleSelection,
  isSelected,
}: EventPreviewModalProps) {
  if (!event) return null;

  const venue = event._embedded?.venues?.[0];
  const date = new Date(event.dates.start.localDate);
  const dateStr = date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = event.dates.start.localTime || '20:00';

  const handleOpenUrl = () => {
    if (event.url) {
      Linking.openURL(event.url);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event-Vorschau</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {event.previewImage && (
            <Image
              source={{ uri: event.previewImage }}
              style={styles.mainImage}
              resizeMode="cover"
            />
          )}

          <View style={styles.body}>
            <View style={styles.statusRow}>
              {event.aiStatus === 'safe' && (
                <View style={styles.statusBadge}>
                  <CheckCircle size={16} color="#fff" />
                  <Text style={styles.statusText}>Von KI empfohlen</Text>
                </View>
              )}
              {event.aiStatus === 'review' && (
                <View style={[styles.statusBadge, styles.statusWarning]}>
                  <AlertCircle size={16} color="#fff" />
                  <Text style={styles.statusText}>Manuelle Prüfung</Text>
                </View>
              )}
              {event.aiStatus === 'rejected' && (
                <View style={[styles.statusBadge, styles.statusDanger]}>
                  <XCircle size={16} color="#fff" />
                  <Text style={styles.statusText}>Abgelehnt</Text>
                </View>
              )}
            </View>

            <Text style={styles.title}>{event.name}</Text>

            {event.aiReason && (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonText}>ℹ️ {event.aiReason}</Text>
              </View>
            )}

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Calendar size={20} color={Colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Datum & Uhrzeit</Text>
                  <Text style={styles.infoValue}>{dateStr}</Text>
                  <Text style={styles.infoValue}>Um {timeStr} Uhr</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <MapPin size={20} color={Colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Veranstaltungsort</Text>
                  <Text style={styles.infoValue}>{venue?.name || 'Nicht angegeben'}</Text>
                  {venue?.address?.line1 && (
                    <Text style={styles.infoSubValue}>{venue.address.line1}</Text>
                  )}
                  {venue?.city?.name && (
                    <Text style={styles.infoSubValue}>
                      {venue.city.name}, {venue.country?.name || 'Deutschland'}
                    </Text>
                  )}
                </View>
              </View>

              {event.priceRanges?.[0] && (
                <View style={styles.infoRow}>
                  <DollarSign size={20} color={Colors.primary} />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Preisbereich</Text>
                    <Text style={styles.infoValue}>
                      {event.priceRanges[0].min} - {event.priceRanges[0].max}{' '}
                      {event.priceRanges[0].currency}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {event.info && (
              <View style={styles.descriptionSection}>
                <Text style={styles.sectionTitle}>Beschreibung</Text>
                <Text style={styles.descriptionText}>{event.info}</Text>
              </View>
            )}

            {event.pleaseNote && (
              <View style={styles.noteSection}>
                <Text style={styles.noteTitle}>⚠️ Wichtige Hinweise</Text>
                <Text style={styles.noteText}>{event.pleaseNote}</Text>
              </View>
            )}

            {event.classifications?.[0] && (
              <View style={styles.categorySection}>
                <Text style={styles.categoryLabel}>Kategorie</Text>
                <View style={styles.categoryTags}>
                  {event.classifications[0].segment?.name && (
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryTagText}>
                        {event.classifications[0].segment.name}
                      </Text>
                    </View>
                  )}
                  {event.classifications[0].genre?.name && (
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryTagText}>
                        {event.classifications[0].genre.name}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.ticketButton} onPress={handleOpenUrl}>
              <ExternalLink size={20} color="#fff" />
              <Text style={styles.ticketButtonText}>Tickets auf Ticketmaster</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.selectButton, isSelected && styles.selectButtonActive]}
            onPress={() => onToggleSelection(event.id)}
          >
            {isSelected ? (
              <>
                <CheckCircle size={20} color="#fff" />
                <Text style={styles.selectButtonText}>Ausgewählt</Text>
              </>
            ) : (
              <>
                <View style={styles.selectCircle} />
                <Text style={[styles.selectButtonText, styles.selectButtonTextInactive]}>
                  Auswählen
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  mainImage: {
    width: '100%',
    height: 250,
    backgroundColor: Colors.background,
  },
  body: {
    padding: Spacing.md,
  },
  statusRow: {
    marginBottom: Spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: '#4caf50',
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusWarning: {
    backgroundColor: '#ff9800',
  },
  statusDanger: {
    backgroundColor: '#f44336',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
    lineHeight: 32,
  },
  reasonBox: {
    backgroundColor: '#fff3cd',
    padding: Spacing.sm,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  reasonText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  infoSection: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 22,
  },
  infoSubValue: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  descriptionSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  descriptionText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
  },
  noteSection: {
    backgroundColor: '#fff3cd',
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.lg,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: Spacing.xs,
  },
  noteText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  categorySection: {
    marginBottom: Spacing.lg,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  categoryTags: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  categoryTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: Colors.primary,
    borderRadius: 16,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  ticketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: '#1976d2',
    padding: Spacing.md,
    borderRadius: 8,
  },
  ticketButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  footer: {
    padding: Spacing.md,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.border,
    padding: Spacing.md,
    borderRadius: 8,
  },
  selectButtonActive: {
    backgroundColor: Colors.primary,
  },
  selectCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.text,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  selectButtonTextInactive: {
    color: Colors.text,
  },
});
