import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { usePigs } from '@/hooks/usePigs';
import { useBreeds } from '@/hooks/useBreeds';
import { useMonitoring } from '@/hooks/useMonitoring';
import { calculateRiskLevel, getRiskColor } from '@/utils/risk';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Link } from 'expo-router';
import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

// Enhanced notification history type
type NotificationHistory = {
  id: string;
  timestamp: number;
  type: 'high-risk' | 'moderate-risk' | 'temperature' | 'symptoms' | 'monitoring';
  title: string;
  message: string;
  pigIds: number[];
  severity: 'high' | 'moderate' | 'low';
  isRead: boolean;
};

// Add filter type
type NotificationFilter = 'all' | 'high-risk' | 'moderate-risk' | 'monitoring';

export default function NotificationsScreen() {
  const { pigs } = usePigs();
  const { breeds } = useBreeds();
  const { records, checklistRecords } = useMonitoring();
  const [refreshing, setRefreshing] = useState(false);
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistory[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notification history from storage
  useEffect(() => {
    loadNotificationHistory();
  }, []);

  // Process risk notifications
  useEffect(() => {
    const processRiskNotifications = async () => {
      if (!pigs.length || !breeds.length || !records || !checklistRecords) return;

      const riskPigs = pigs.map(pig => {
        const breed = breeds.find(b => b.id === pig.breed_id);
        if (!breed) return null;

        const pigRecords = records.filter(r => r.pig_id === pig.id);
        const pigChecklistRecords = checklistRecords.filter(r =>
          pigRecords.some(pr => pr.id === r.monitoring_id)
        );

        const riskAnalysis = calculateRiskLevel(pigRecords, pigChecklistRecords, breed, pig.category);
        return { ...pig, breed, riskLevel: riskAnalysis.riskLevel };
      }).filter(pig => pig && ['High', 'Moderate'].includes(pig.riskLevel));

      // Get current history
      const history = await AsyncStorage.getItem('notificationHistory');
      const currentHistory: NotificationHistory[] = history ? JSON.parse(history) : [];

      // Create notifications only for new risk situations
      const newNotifications = riskPigs.map(pig => {
        if (!pig) return null;

        // Check if we already have a recent notification (within last hour) for this pig with same risk level
        const hasRecentNotification = currentHistory.some(notification =>
          notification.pigIds.includes(pig.id) &&
          notification.type === (pig.riskLevel === 'High' ? 'high-risk' : 'moderate-risk') &&
          Date.now() - notification.timestamp < 3600000 // 1 hour in milliseconds
        );

        if (hasRecentNotification) return null;

        return {
          id: `${pig.id}-${Date.now()}`,
          timestamp: Date.now(),
          type: pig.riskLevel === 'High' ? 'high-risk' : 'moderate-risk',
          title: `${pig.riskLevel} Risk Alert`,
          message: `${pig.name} requires attention due to health status`,
          pigIds: [pig.id],
          severity: pig.riskLevel.toLowerCase() as 'high' | 'moderate',
          isRead: false
        };
      }).filter(Boolean) as NotificationHistory[];

      // Add new notifications to history only if there are any
      if (newNotifications.length > 0) {
        const updatedHistory = [...newNotifications, ...currentHistory];
        await AsyncStorage.setItem('notificationHistory', JSON.stringify(updatedHistory));
        setNotificationHistory(updatedHistory);
      } else {
        setNotificationHistory(currentHistory);
      }
    };

    processRiskNotifications();
  }, [pigs, breeds, records, checklistRecords]);

  // Update unread count when history changes
  useEffect(() => {
    const count = notificationHistory.filter(n => !n.isRead).length;
    setUnreadCount(count);
  }, [notificationHistory]);

  const loadNotificationHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem('notificationHistory');
      if (stored) {
        setNotificationHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading notification history:', error);
    }
  };

  const saveNotificationHistory = async (history: NotificationHistory[]) => {
    try {
      await AsyncStorage.setItem('notificationHistory', JSON.stringify(history));
    } catch (error) {
      console.error('Error saving notification history:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    const updated = notificationHistory.map(n =>
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    setNotificationHistory(updated);
    await saveNotificationHistory(updated);
  };

  const clearHistory = async () => {
    setNotificationHistory([]);
    await AsyncStorage.removeItem('notificationHistory');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotificationHistory();
    setRefreshing(false);
  };

  // Filter notifications based on selected type
  const filteredHistory = notificationHistory.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'high-risk') return notification.severity === 'high';
    if (filter === 'moderate-risk') return notification.severity === 'moderate';
    if (filter === 'monitoring') return notification.type === 'monitoring';
    return true;
  });

  // Group notifications by date
  const groupedNotifications = filteredHistory.reduce((groups, notification) => {
    const date = format(notification.timestamp, 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {} as Record<string, NotificationHistory[]>);

  // Render filter buttons
  const renderFilterButtons = () => (
    <ThemedView style={styles.filterContainer}>
      {(['all', 'high-risk', 'moderate-risk', 'monitoring'] as NotificationFilter[]).map((type) => (
        <TouchableOpacity
          key={type}
          style={[
            styles.filterButton,
            filter === type && styles.filterButtonActive
          ]}
          onPress={() => setFilter(type)}
        >
          <IconSymbol
            name={
              type === 'all' ? 'bell.fill' :
                type === 'high-risk' ? 'exclamationmark.triangle.fill' :
                  type === 'moderate-risk' ? 'exclamationmark.circle.fill' :
                    'clock.fill'
            }
            size={16}
            color={filter === type ? '#007AFF' : '#8E8E93'}
          />
          <ThemedText style={[
            styles.filterButtonText,
            filter === type && styles.filterButtonTextActive
          ]}>
            {type.split('-').map(word =>
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </ThemedView>
  );

  // Render notification history
  const renderNotificationHistory = () => (
    <Animated.View
      style={styles.historySection}
      entering={FadeInUp.duration(600).springify()}
    >
      <ThemedView style={styles.historyHeader}>
        <ThemedText style={styles.historyTitle}>Notification History</ThemedText>
        {notificationHistory.length > 0 && (
          <TouchableOpacity onPress={clearHistory}>
            <ThemedText style={styles.clearButton}>Clear All</ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>

      {Object.entries(groupedNotifications).map(([date, notifications]) => (
        <ThemedView key={date} style={styles.dateGroup}>
          <ThemedText style={styles.dateHeader}>
            {format(new Date(date), 'MMMM d, yyyy')}
          </ThemedText>
          {notifications.map(notification => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.historyItem,
                !notification.isRead && styles.unreadItem
              ]}
              onPress={() => markAsRead(notification.id)}
            >
              <ThemedView style={styles.notificationIcon}>
                <IconSymbol
                  name={
                    notification.type === 'high-risk' ? 'exclamationmark.triangle.fill' :
                      notification.type === 'moderate-risk' ? 'exclamationmark.circle.fill' :
                        notification.type === 'temperature' ? 'thermometer' :
                          notification.type === 'symptoms' ? 'bandage' :
                            'clock'
                  }
                  size={20}
                  color={
                    notification.severity === 'high' ? '#FF453A' :
                      notification.severity === 'moderate' ? '#FF9500' :
                        '#30D158'
                  }
                />
              </ThemedView>
              <ThemedView style={styles.notificationContent}>
                <ThemedText style={styles.notificationTitle}>
                  {notification.title}
                </ThemedText>
                <ThemedText style={styles.notificationMessage}>
                  {notification.message}
                </ThemedText>
                <ThemedText style={styles.notificationTime}>
                  {format(notification.timestamp, 'h:mm a')}
                </ThemedText>
              </ThemedView>
              {!notification.isRead && (
                <ThemedView style={styles.unreadDot} />
              )}
            </TouchableOpacity>
          ))}
        </ThemedView>
      ))}
    </Animated.View>
  );

  // Render risk alerts
  const renderRiskAlerts = () => {
    const riskPigs = pigs.map(pig => {
      const breed = breeds.find(b => b.id === pig.breed_id);
      if (!breed) return null;

      const pigRecords = records?.filter(r => r.pig_id === pig.id) || [];
      const pigChecklistRecords = checklistRecords?.filter(r =>
        pigRecords.some(pr => pr.id === r.monitoring_id)
      ) || [];

      const riskAnalysis = calculateRiskLevel(pigRecords, pigChecklistRecords, breed, pig.category);
      return { ...pig, breed, riskLevel: riskAnalysis.riskLevel };
    }).filter(pig => pig && ['High', 'Moderate'].includes(pig.riskLevel));

    if (riskPigs.length === 0) {
      return (
        <ThemedView style={styles.emptyState}>
          <ThemedView style={styles.emptyStateIcon}>
            <IconSymbol name="checkmark.shield.fill" size={48} color="#30D158" />
          </ThemedView>
          <ThemedText style={styles.emptyStateText}>All Clear</ThemedText>
          <ThemedText style={styles.emptyStateSubtext}>
            No pigs require immediate attention
          </ThemedText>
        </ThemedView>
      );
    }

    return (
      <Animated.View entering={FadeInDown.duration(600).springify()}>
        <ThemedView style={styles.alertsHeader}>
          <ThemedText style={styles.alertsTitle}>
            Risk Alerts
          </ThemedText>
          <ThemedText style={styles.alertsSubtitle}>
            {riskPigs.length} {riskPigs.length === 1 ? 'pig needs' : 'pigs need'} attention
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.alertsList}>
          {riskPigs.map((pig, index) => {
            if (!pig) return null;
            const riskColor = getRiskColor(pig.riskLevel);

            return (
              <Animated.View
                key={pig.id}
                entering={FadeInUp.delay(index * 100).duration(600).springify()}
              >
                <Link
                  href={{
                    pathname: "/(pigs)/[id]/report" as const,
                    params: { id: pig.id }
                  }}
                  asChild
                >
                  <TouchableOpacity style={styles.alertCardWrapper}>
                    <ThemedView style={styles.alertCard}>
                      <ThemedView style={styles.alertCardTop}>
                        <ThemedView style={styles.pigProfile}>
                          {pig.image ? (
                            <Image
                              source={{ uri: pig.image }}
                              style={styles.pigImage}
                            />
                          ) : (
                            <ThemedView style={styles.pigImagePlaceholder}>
                              <ThemedText style={styles.pigImageInitial}>
                                {pig.name.charAt(0)}
                              </ThemedText>
                            </ThemedView>
                          )}
                          <ThemedView style={styles.pigInfo}>
                            <ThemedText style={styles.pigName}>{pig.name}</ThemedText>
                            <ThemedText style={styles.pigBreed}>{pig.breed.name}</ThemedText>
                          </ThemedView>
                        </ThemedView>
                        <ThemedView style={[
                          styles.riskBadge,
                          { backgroundColor: `${riskColor}15` }
                        ]}>
                          <IconSymbol
                            name={pig.riskLevel === 'High' ?
                              'exclamationmark.triangle.fill' :
                              'exclamationmark.circle.fill'}
                            size={16}
                            color={riskColor}
                          />
                          <ThemedText style={[styles.riskText, { color: riskColor }]}>
                            {pig.riskLevel}
                          </ThemedText>
                        </ThemedView>
                      </ThemedView>

                      <ThemedView style={styles.alertMessage}>
                        <IconSymbol
                          name="info.circle.fill"
                          size={16}
                          color="#8E8E93"
                          style={styles.messageIcon}
                        />
                        <ThemedText style={styles.messageText}>
                          {pig.riskLevel === 'High'
                            ? 'Immediate attention required'
                            : 'Monitor closely for changes'}
                        </ThemedText>
                      </ThemedView>

                      <ThemedView style={styles.actionButton}>
                        <ThemedText style={styles.actionButtonText}>
                          Check Health Status
                        </ThemedText>
                        <IconSymbol name="arrow.right" size={18} color="#007AFF" />
                      </ThemedView>
                    </ThemedView>
                  </TouchableOpacity>
                </Link>
              </Animated.View>
            );
          })}
        </ThemedView>
      </Animated.View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headerTop}>
          <TouchableOpacity onPress={() => require('expo-router').router.back()} style={{ marginRight: 'auto' }}>
            <IconSymbol name="chevron.left" size={28} color="#007AFF" />
          </TouchableOpacity>
        </ThemedView>
        <ThemedView style={[styles.headerTop, { marginTop: 10 }]}>
          <ThemedText style={styles.title}>Alerts</ThemedText>
          <ThemedView>
            <IconSymbol name="bell.fill" size={28} color="#007AFF" />
            {unreadCount > 0 && (
              <ThemedText style={styles.headerBadgeCount}>
                {unreadCount}
              </ThemedText>
            )}
          </ThemedView>
        </ThemedView>
        <ThemedText style={styles.subtitle}>
          Monitor pigs that need attention
        </ThemedText>
      </ThemedView>

      {/* Filter Buttons */}
      {renderFilterButtons()}

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {/* Risk Alerts Section */}
        {renderRiskAlerts()}

        {/* Notification History */}
        {renderNotificationHistory()}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    gap: 8,
    backgroundColor: 'transparent',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    letterSpacing: -0.2,
  },
  headerBadgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF453A',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    textAlign: 'center',
    overflow: 'hidden',
    lineHeight: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 24,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.1)',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#007AFF',
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 32,
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.1)',
  },
  emptyStateIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#30D158',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptyStateSubtext: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  alertsHeader: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertsTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  alertsSubtitle: {
    fontSize: 15,
    opacity: 0.7,
    color: '#FF453A',
    fontWeight: '600',
  },
  alertsList: {
    gap: 16,
  },
  alertCardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  alertCard: {
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.1)',
  },
  alertCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pigProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pigImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  pigImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(142, 142, 147, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.1)',
  },
  pigImageInitial: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
  },
  pigInfo: {
    gap: 4,
  },
  pigName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  pigBreed: {
    fontSize: 14,
    opacity: 0.7,
    letterSpacing: -0.2,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  riskText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  alertMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    padding: 16,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.1)',
  },
  messageIcon: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 15,
    opacity: 0.9,
    fontWeight: '500',
    letterSpacing: -0.2,
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(142, 142, 147, 0.1)',
  },
  actionButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  historySection: {
    padding: 16,
    marginTop: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  clearButton: {
    fontSize: 15,
    color: '#FF453A',
    fontWeight: '600',
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.7,
    letterSpacing: -0.2,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.1)',
  },
  notificationContent: {
    flex: 1,
    marginLeft: 14,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  notificationMessage: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  notificationTime: {
    fontSize: 13,
    opacity: 0.6,
    letterSpacing: -0.1,
  },
  unreadItem: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.1)',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
    marginLeft: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.1)',
  },
}); 