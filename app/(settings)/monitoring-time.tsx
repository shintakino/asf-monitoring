import { useState, useEffect } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useSettings } from '@/hooks/useSettings';

export default function MonitoringTimeScreen() {
  const { settings, updateMonitoringTime, refreshSettings } = useSettings();
  const [showPicker, setShowPicker] = useState(false);
  
  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const startTime = settings?.monitoring_start_time || '08:00';
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);

  const endDate = new Date(startDate.getTime() + (7 * 60 * 60 * 1000));
  const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${
    endDate.getMinutes().toString().padStart(2, '0')}`;

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      await updateMonitoringTime(timeString);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Monitoring Schedule',
          headerBackTitle: 'Settings',
        }}
      />
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <IconSymbol name="clock.fill" size={32} color="#007AFF" />
          <ThemedText style={styles.headerTitle}>Daily Monitoring Time</ThemedText>
          <ThemedText style={styles.headerDescription}>
            Set the start time for daily health monitoring. Monitoring can be done twice per day,
            with a 7-hour interval between checks.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedView 
            style={styles.settingItem}
            onTouchEnd={() => setShowPicker(true)}
          >
            <ThemedText style={styles.settingLabel}>First Monitoring</ThemedText>
            <ThemedView style={styles.timeDisplay}>
              <IconSymbol name="sunrise.fill" size={20} color="#FF9500" />
              <ThemedText style={styles.timeText}>{startTime}</ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>Second Monitoring</ThemedText>
            <ThemedView style={styles.timeDisplay}>
              <IconSymbol name="sunset.fill" size={20} color="#FF9500" />
              <ThemedText style={styles.timeText}>{endTime}</ThemedText>
              <ThemedText style={styles.timeNote}>(+7 hours)</ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        <ThemedText style={styles.note}>
          Tap on First Monitoring time to change the daily start time.
          The second monitoring will automatically be scheduled 7 hours after
          the first monitoring is completed.
        </ThemedText>

        {showPicker && (
          <DateTimePicker
            value={startDate}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  headerDescription: {
    fontSize: 15,
    textAlign: 'center',
    color: '#8E8E93',
    paddingHorizontal: 24,
  },
  section: {
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.1)',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 17,
    fontWeight: '500',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF9500',
  },
  timeNote: {
    fontSize: 13,
    color: '#8E8E93',
  },
  note: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
}); 