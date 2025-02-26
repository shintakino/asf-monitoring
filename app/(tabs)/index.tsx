import React from 'react';
import { StyleSheet, Dimensions, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { usePigs } from '@/hooks/usePigs';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { calculateMonitoringTiming } from '@/utils/monitoring';
import type { Pig } from '@/utils/database';
import { useSettings } from '@/hooks/useSettings';

// Add this type definition at the top with other types
type MonitoringFilter = 'All' | 'Monitored' | 'Not Monitored';

export default function DashboardScreen() {
  const { pigs, isLoading, error, refreshPigs } = usePigs();
  const { settings, refreshSettings } = useSettings();
  // Add state for filter
  const [filterStatus, setFilterStatus] = useState<MonitoringFilter>('All');

  useFocusEffect(
    useCallback(() => {
      refreshPigs();
      refreshSettings();
    }, [refreshPigs, refreshSettings])
  );

  const today = new Date().toISOString().split('T')[0];
  const monitoredCount = pigs.filter(pig => 
    pig.lastMonitoredDate === today
  ).length;
  const notMonitoredCount = pigs.length - monitoredCount;

  // Add this sorting function
  const sortPigs = (pigs: Pig[]) => {
    const today = new Date().toISOString().split('T')[0];
    
    return pigs.sort((a, b) => {
      const timingA = calculateMonitoringTiming(
        a.lastMonitoredTime && a.lastMonitoredDate === today ? a.lastMonitoredTime : null,
        settings?.monitoring_start_time || '08:00'
      );
      const timingB = calculateMonitoringTiming(
        b.lastMonitoredTime && b.lastMonitoredDate === today ? b.lastMonitoredTime : null,
        settings?.monitoring_start_time || '08:00'
      );

      // First priority: Ready for monitoring
      if (timingA.canMonitor && !timingB.canMonitor) return -1;
      if (!timingA.canMonitor && timingB.canMonitor) return 1;

      // Second priority: Next monitoring time
      if (timingA.timeRemaining && timingB.timeRemaining) {
        const timeA = new Date(`2000/01/01 ${timingA.nextMonitoringTime}`).getTime();
        const timeB = new Date(`2000/01/01 ${timingB.nextMonitoringTime}`).getTime();
        return timeA - timeB;
      }

      // Keep original order for other cases
      return 0;
    });
  };

  // Update the filteredPigs calculation
  const filteredPigs = useMemo(() => {
    const filtered = pigs.filter(pig => {
      const isMonitored = pig.lastMonitoredDate === today;
      switch (filterStatus) {
        case 'Monitored':
          return isMonitored;
        case 'Not Monitored':
          return !isMonitored;
        default:
          return true;
      }
    });

    return sortPigs(filtered);
  }, [pigs, filterStatus, today, settings?.monitoring_start_time]);

  const renderPigCard = (pig: Pig) => {
    const today = new Date().toISOString().split('T')[0];
    const monitoringTiming = calculateMonitoringTiming(
      pig.lastMonitoredTime && pig.lastMonitoredDate === today ? pig.lastMonitoredTime : null,
      settings?.monitoring_start_time || '08:00'
    );

    return (
      <ThemedView key={pig.id} style={styles.pigCard} darkColor="#1C1C1E" lightColor="#FFFFFF">
        {monitoringTiming.canMonitor ? (
          <Link
            href={{
              pathname: "/(pigs)/[id]/monitor" as const,
              params: { id: pig.id }
            }}
            style={styles.pigCardContent}
          >
            <ThemedView style={styles.pigImageContainer}>
              {pig.image ? (
                <Image source={{ uri: pig.image }} style={styles.pigImage} />
              ) : (
                <ThemedView style={styles.pigImagePlaceholder} darkColor="#2C2C2E" lightColor="#E5E5EA">
                  <ThemedText style={styles.pigImageInitial}>
                    {pig.name.charAt(0).toUpperCase()}
                  </ThemedText>
                </ThemedView>
              )}
            </ThemedView>
            <ThemedView style={styles.pigInfo}>
              <ThemedView style={styles.pigNameRow}>
                <ThemedText style={styles.pigName} darkColor="#FFFFFF" lightColor="#000000">
                  {pig.name}
                </ThemedText>
                <ThemedView style={[
                  styles.monitoringBadge,
                  monitoringTiming.lastMonitoredTime ? styles.monitoredBadge : styles.notMonitoredBadge
                ]}>
                  <IconSymbol 
                    name={monitoringTiming.lastMonitoredTime ? "checkmark.circle.fill" : "exclamationmark.circle.fill"} 
                    size={14} 
                    color={monitoringTiming.lastMonitoredTime ? "#30D158" : "#FF453A"} 
                  />
                  <ThemedText style={[
                    styles.monitoringText,
                    monitoringTiming.lastMonitoredTime ? styles.monitoredText : styles.notMonitoredText
                  ]}>
                    {monitoringTiming.lastMonitoredTime ? 'Monitored' : 'Not Monitored'}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
              <ThemedView style={styles.monitoringInfo}>
                {monitoringTiming.lastMonitoredTime ? (
                  <ThemedView style={styles.monitoringTimeContainer}>
                    <ThemedText style={styles.monitoringTimeText}>
                      Last monitored: {monitoringTiming.lastMonitoredTime}
                    </ThemedText>
                    {monitoringTiming.timeRemaining && (
                      <ThemedText style={[styles.monitoringTimeText, styles.nextMonitoringText]}>
                        Next monitoring in: {monitoringTiming.timeRemaining}
                      </ThemedText>
                    )}
                  </ThemedView>
                ) : (
                  <ThemedText style={styles.monitoringTimeText}>
                    {monitoringTiming.canMonitor ? 
                      'Ready for monitoring' : 
                      `Starts at ${monitoringTiming.nextMonitoringTime}`
                    }
                  </ThemedText>
                )}
              </ThemedView>
              <ThemedView style={styles.pigMetaInfo}>
                <ThemedText style={styles.pigDetails} darkColor="#8E8E93" lightColor="#8E8E93">
                  {pig.breed_name}
                </ThemedText>
                <ThemedText style={styles.pigDot} darkColor="#8E8E93" lightColor="#8E8E93">
                  •
                </ThemedText>
                <ThemedView style={[
                  styles.categoryBadge,
                  pig.category === 'Adult' ? styles.adultBadge : styles.youngBadge
                ]}>
                  <ThemedText style={[
                    styles.categoryText,
                    pig.category === 'Adult' ? styles.adultText : styles.youngText
                  ]}>
                    {pig.category}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
            </ThemedView>
          </Link>
        ) : (
          <ThemedView style={[styles.pigCardContent, styles.pigCardDisabled]}>
            <ThemedView style={styles.pigImageContainer}>
              {pig.image ? (
                <Image source={{ uri: pig.image }} style={styles.pigImage} />
              ) : (
                <ThemedView style={styles.pigImagePlaceholder} darkColor="#2C2C2E" lightColor="#E5E5EA">
                  <ThemedText style={styles.pigImageInitial}>
                    {pig.name.charAt(0).toUpperCase()}
                  </ThemedText>
                </ThemedView>
              )}
            </ThemedView>
            <ThemedView style={styles.pigInfo}>
              <ThemedView style={styles.pigNameRow}>
                <ThemedText style={styles.pigName} darkColor="#FFFFFF" lightColor="#000000">
                  {pig.name}
                </ThemedText>
                <ThemedView style={[
                  styles.monitoringBadge,
                  monitoringTiming.lastMonitoredTime ? styles.monitoredBadge : styles.notMonitoredBadge
                ]}>
                  <IconSymbol 
                    name={monitoringTiming.lastMonitoredTime ? "checkmark.circle.fill" : "exclamationmark.circle.fill"} 
                    size={14} 
                    color={monitoringTiming.lastMonitoredTime ? "#30D158" : "#FF453A"} 
                  />
                  <ThemedText style={[
                    styles.monitoringText,
                    monitoringTiming.lastMonitoredTime ? styles.monitoredText : styles.notMonitoredText
                  ]}>
                    {monitoringTiming.lastMonitoredTime ? 'Monitored' : 'Not Monitored'}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
              <ThemedView style={styles.monitoringInfo}>
                {monitoringTiming.lastMonitoredTime ? (
                  <ThemedView style={styles.monitoringTimeContainer}>
                    <ThemedText style={styles.monitoringTimeText}>
                      Last monitored: {monitoringTiming.lastMonitoredTime}
                    </ThemedText>
                    {monitoringTiming.timeRemaining && (
                      <ThemedText style={[styles.monitoringTimeText, styles.nextMonitoringText]}>
                        Next monitoring in: {monitoringTiming.timeRemaining}
                      </ThemedText>
                    )}
                  </ThemedView>
                ) : (
                  <ThemedText style={styles.monitoringTimeText}>
                    Starts at {monitoringTiming.nextMonitoringTime}
                  </ThemedText>
                )}
              </ThemedView>
              <ThemedView style={styles.pigMetaInfo}>
                <ThemedText style={styles.pigDetails} darkColor="#8E8E93" lightColor="#8E8E93">
                  {pig.breed_name}
                </ThemedText>
                <ThemedText style={styles.pigDot} darkColor="#8E8E93" lightColor="#8E8E93">
                  •
                </ThemedText>
                <ThemedView style={[
                  styles.categoryBadge,
                  pig.category === 'Adult' ? styles.adultBadge : styles.youngBadge
                ]}>
                  <ThemedText style={[
                    styles.categoryText,
                    pig.category === 'Adult' ? styles.adultText : styles.youngText
                  ]}>
                    {pig.category}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        )}
      </ThemedView>
    );
  };

  // Update the filter buttons section
  const renderFilterButtons = () => (
    <ThemedView style={styles.filterContainer}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>Filter Status</ThemedText>
      <ThemedView style={styles.filterButtons}>
        {(['All', 'Monitored', 'Not Monitored'] as MonitoringFilter[]).map((status) => (
          <ThemedView
            key={status}
            style={[
              styles.filterButton,
              filterStatus === status && styles.filterButtonActive
            ]}
            onTouchEnd={() => setFilterStatus(status)}
          >
            <IconSymbol 
              name={
                status === 'All' ? "list.bullet" :
                status === 'Monitored' ? "checkmark.circle" :
                "exclamationmark.circle"
              } 
              size={20} 
              color={filterStatus === status ? "#007AFF" : "#8E8E93"} 
            />
            <ThemedText style={[
              styles.filterButtonText,
              filterStatus === status && styles.filterButtonTextActive
            ]}>
              {status}
            </ThemedText>
          </ThemedView>
        ))}
      </ThemedView>
    </ThemedView>
  );

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <ThemedView style={styles.headerContent}>
        <Image
            source={require('@/assets/images/pig.png')}
            style={styles.headerIcon}
          />
          <ThemedView style={styles.headerTextContainer}>
            <ThemedText style={styles.headerTitle}>ASF Monitor</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              African Swine Fever Monitoring System
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.headerBadge}>
            <IconSymbol name="wifi.slash" size={16} color="#FF9500" />
            <ThemedText style={styles.headerBadgeText}>Offline Mode</ThemedText>
          </ThemedView>
        </ThemedView>
      }>
      {/* Stats Section */}
      <ThemedView style={styles.statsContainer}>
        <ThemedView style={styles.statCard}>
          <IconSymbol name="pawprint.fill" size={32} color="#FF9500" />
          <ThemedText style={styles.statNumber} type="title">{pigs.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Total Pigs</ThemedText>
        </ThemedView>
        <ThemedView style={styles.statCard}>
          <IconSymbol name="checkmark.circle.fill" size={32} color="#30D158" />
          <ThemedText style={styles.statNumber} type="title">{monitoredCount}</ThemedText>
          <ThemedText style={styles.statLabel}>Monitored</ThemedText>
        </ThemedView>
        <ThemedView style={styles.statCard}>
          <IconSymbol name="exclamationmark.circle.fill" size={32} color="#FF453A" />
          <ThemedText style={styles.statNumber} type="title">{notMonitoredCount}</ThemedText>
          <ThemedText style={styles.statLabel}>Not Monitored</ThemedText>
        </ThemedView>
      </ThemedView>

      {/* Replace the filter section with the new render function */}
      {renderFilterButtons()}

      {/* Update the Pig List Section to use filteredPigs */}
      <ThemedView style={styles.pigListContainer}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Pig Profiles {filteredPigs.length > 0 && `(${filteredPigs.length})`}
        </ThemedText>
        
        {isLoading ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </ThemedView>
        ) : error ? (
          <ThemedView style={styles.errorContainer}>
            <IconSymbol name="exclamationmark.triangle.fill" size={32} color="#FF453A" />
            <ThemedText style={styles.errorText}>{error.message}</ThemedText>
          </ThemedView>
        ) : filteredPigs.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <IconSymbol 
              name={filterStatus === 'All' ? "plus.circle.fill" : "magnifyingglass"} 
              size={48} 
              color="#007AFF" 
            />
            <ThemedText style={styles.emptyStateText}>
              {filterStatus === 'All' 
                ? 'No pigs added yet'
                : `No ${filterStatus.toLowerCase()} pigs found`
              }
            </ThemedText>
            <ThemedText style={styles.emptyStateSubtext}>
              {filterStatus === 'All'
                ? 'Add your first pig to start monitoring'
                : 'Try changing your filter selection'
              }
            </ThemedText>
            {filterStatus === 'All' && (
            <Link href="/(pigs)/new" style={styles.emptyStateButton}>
                <ThemedText style={styles.emptyStateButtonText}>
                  Add Your First Pig
                </ThemedText>
            </Link>
            )}
          </ThemedView>
        ) : (
          <ScrollView style={styles.pigsList} contentContainerStyle={styles.pigsListContent}>
            {filteredPigs.map(renderPigCard)}
          </ScrollView>
        )}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  headerContent: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
  },
  headerTextContainer: {
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    paddingTop: 3,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 16,
    gap: 6,
    marginTop: 8,
    
  },
  headerBadgeText: {
    fontSize: 13,
    color: '#FF9500',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterContainer: {
    padding: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.1)',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#8E8E93',
  },
  filterButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  pigListContainer: {
    padding: 16,
    minHeight: 300,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  pigsList: {
    flex: 1,
  },
  pigsListContent: {
    padding: 16,
    gap: 12,
  },
  pigCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pigCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  pigImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  pigImage: {
    width: '100%',
    height: '100%',
  },
  pigImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pigImageInitial: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
  },
  pigInfo: {
    flex: 1,
    gap: 4,
  },
  pigNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pigName: {
    fontSize: 17,
    fontWeight: '600',
  },
  pigMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pigDetails: {
    fontSize: 15,
  },
  pigDot: {
    fontSize: 15,
    opacity: 0.5,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  adultBadge: {
    backgroundColor: 'rgba(48, 209, 88, 0.2)',
  },
  youngBadge: {
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
  },
  adultText: {
    color: '#30D158',
  },
  youngText: {
    color: '#FF9500',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    minHeight: 200,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderRadius: 16,
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: '#FF453A',
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 16,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  monitoringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  monitoredBadge: {
    backgroundColor: 'rgba(48, 209, 88, 0.1)',
  },
  notMonitoredBadge: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
  },
  monitoringText: {
    fontSize: 12,
    fontWeight: '600',
  },
  monitoredText: {
    color: '#30D158',
  },
  notMonitoredText: {
    color: '#FF453A',
  },
  monitoringInfo: {
    marginTop: 4,
  },
  monitoringTimeContainer: {
    gap: 4,  // This creates vertical spacing between the lines
  },
  monitoringTimeText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  pigCardDisabled: {
    opacity: 0.6,
    pointerEvents: 'none',
  },
  nextMonitoringText: {
    color: '#FF9500',
  },
});
