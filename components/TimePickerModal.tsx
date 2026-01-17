import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { X, Clock } from 'lucide-react-native';

interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onTimeSelect: (time: string) => void;
  selectedTime?: string;
  title?: string;
  selectedDate?: string;
}

export default function TimePickerModal({ 
  visible, 
  onClose, 
  onTimeSelect, 
  selectedTime,
  title = 'Uhrzeit auswählen',
  selectedDate
}: TimePickerModalProps) {
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let min = 0; min < 60; min += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        times.push(timeString);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  const isPastTime = (time: string) => {
    if (!selectedDate) return false;
    
    const today = new Date();
    const selectedDateObj = new Date(selectedDate);
    
    // Only check for past time if selected date is today
    const isToday = selectedDateObj.toDateString() === today.toDateString();
    if (!isToday) return false;
    
    const [hour, minute] = time.split(':').map(Number);
    const timeInMinutes = hour * 60 + minute;
    const currentTimeInMinutes = today.getHours() * 60 + today.getMinutes();
    
    return timeInMinutes < currentTimeInMinutes;
  };

  const handleTimeSelect = (time: string) => {
    if (isPastTime(time)) return;
    onTimeSelect(time);
    onClose();
  };

  const isSelectedTime = (time: string) => {
    return selectedTime === time;
  };

  const scrollToSelectedTime = () => {
    // This would scroll to selected time in a real implementation
    // For now, we'll just show all times
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.headerRight} />
          </View>

          {/* Time List */}
          <ScrollView style={styles.timeList} showsVerticalScrollIndicator={false}>
            <View style={styles.timeGrid}>
              {timeOptions.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeItem,
                    isSelectedTime(time) && styles.selectedTimeItem,
                    isPastTime(time) && styles.pastTimeItem
                  ]}
                  onPress={() => handleTimeSelect(time)}
                  disabled={isPastTime(time)}
                >
                  <Clock 
                    size={16} 
                    color={isPastTime(time) ? "#9CA3AF" : (isSelectedTime(time) ? "#FFFFFF" : "#8B5CF6")} 
                  />
                  <Text style={[
                    styles.timeText,
                    isSelectedTime(time) && styles.selectedTimeText,
                    isPastTime(time) && styles.pastTimeText
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Quick Select */}
          <View style={styles.quickSelect}>
            <Text style={styles.quickSelectTitle}>Schnellauswahl:</Text>
            <View style={styles.quickSelectButtons}>
              {['09:00', '12:00', '15:00', '18:00', '20:00'].map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.quickSelectButton,
                    isPastTime(time) && styles.quickSelectButtonDisabled
                  ]}
                  onPress={() => handleTimeSelect(time)}
                  disabled={isPastTime(time)}
                >
                  <Text style={[
                    styles.quickSelectButtonText,
                    isPastTime(time) && styles.quickSelectButtonTextDisabled
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  headerRight: {
    width: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  timeList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 16,
    gap: 8,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: '30%',
    marginBottom: 8,
  },
  selectedTimeItem: {
    backgroundColor: '#8B5CF6',
  },
  pastTimeItem: {
    backgroundColor: '#F3F4F6',
    opacity: 0.5,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  selectedTimeText: {
    color: '#FFFFFF',
  },
  pastTimeText: {
    color: '#9CA3AF',
  },
  quickSelect: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  quickSelectTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  quickSelectButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  quickSelectButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickSelectButtonDisabled: {
    opacity: 0.5,
  },
  quickSelectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  quickSelectButtonTextDisabled: {
    color: '#9CA3AF',
  },
});