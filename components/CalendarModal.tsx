import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  onDateSelect: (date: string) => void;
  selectedDate?: string;
}

export default function CalendarModal({ 
  visible, 
  onClose, 
  onDateSelect, 
  selectedDate 
}: CalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  
  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get first day of week (0 = Sunday, 1 = Monday, etc.)
    let firstDayOfWeek = firstDay.getDay();
    // Convert Sunday (0) to 7 for easier calculation
    if (firstDayOfWeek === 0) firstDayOfWeek = 7;
    // Adjust to make Monday = 1
    firstDayOfWeek = firstDayOfWeek - 1;
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const handleDayPress = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const selectedDateObj = new Date(year, month, day, 12, 0, 0); // Set to noon to avoid timezone issues
    const dateString = selectedDateObj.toISOString().split('T')[0];
    onDateSelect(dateString);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isSelectedDay = (day: number) => {
    if (!selectedDate || !day) return false;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dayDate = new Date(year, month, day);
    const dayString = dayDate.toISOString().split('T')[0];
    return dayString === selectedDate;
  };

  const isToday = (day: number) => {
    if (!day) return false;
    const today = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  const isPastDate = (day: number) => {
    if (!day) return false;
    const today = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dayDate = new Date(year, month, day);
    
    // Set both dates to start of day for comparison
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayStart = new Date(year, month, day);
    
    return dayStart < todayStart;
  };

  const days = getDaysInMonth(currentDate);

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
            <Text style={styles.title}>Datum auswählen</Text>
            <View style={styles.headerRight} />
          </View>

          {/* Month Navigation */}
          <View style={styles.monthHeader}>
            <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
              <ChevronLeft size={24} color="#8B5CF6" />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Text>
            <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
              <ChevronRight size={24} color="#8B5CF6" />
            </TouchableOpacity>
          </View>

          {/* Day Names */}
          <View style={styles.dayNamesRow}>
            {dayNames.map((dayName) => (
              <View key={dayName} style={styles.dayNameCell}>
                <Text style={styles.dayNameText}>{dayName}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <ScrollView style={styles.calendarContainer}>
            <View style={styles.calendarGrid}>
              {days.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    day && isSelectedDay(day) && styles.selectedDayCell,
                    day && isToday(day) && styles.todayCell,
                    day && isPastDate(day) && styles.pastDayCell,
                  ]}
                  onPress={() => day && !isPastDate(day) && handleDayPress(day)}
                  disabled={!day || isPastDate(day)}
                >
                  {day && (
                    <Text style={[
                      styles.dayText,
                      isSelectedDay(day) && styles.selectedDayText,
                      isToday(day) && styles.todayText,
                      isPastDate(day) && styles.pastDayText,
                    ]}>
                      {day}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.todayButton}
              onPress={() => {
                const today = new Date();
                setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
                const todayString = today.toISOString().split('T')[0];
                onDateSelect(todayString);
              }}
            >
              <Text style={styles.todayButtonText}>Heute</Text>
            </TouchableOpacity>
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
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: '80%',
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
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  dayNamesRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  calendarContainer: {
    maxHeight: 300,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  dayCell: {
    width: '14.28%', // 100% / 7 days
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  selectedDayCell: {
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
  },
  todayCell: {
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  dayText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  todayText: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  pastDayCell: {
    opacity: 0.3,
  },
  pastDayText: {
    color: '#9CA3AF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  todayButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});