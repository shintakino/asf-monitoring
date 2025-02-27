import { StyleSheet, Dimensions, Image, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import React, { useEffect } from 'react';
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
import { calculateRiskLevel, getRiskColor } from '@/utils/risk';
import { useBreeds } from '@/hooks/useBreeds';
import { useMonitoring } from '@/hooks/useMonitoring';
import { Ionicons } from '@expo/vector-icons';
import { registerForPushNotificationsAsync, scheduleRiskNotification } from '@/utils/notifications';

// Add this type definition at the top with other types
type MonitoringFilter = 'All' | 'Monitored' | 'Not Monitored';

// Add this type definition at the top
type RiskLevel = 'Low' | 'Moderate' | 'High';

export default function DashboardScreen() {
  const { pigs, isLoading, error, refreshPigs } = usePigs();
  const { settings, refreshSettings } = useSettings();
  const { breeds } = useBreeds();
  const { records, checklistRecords } = useMonitoring();
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

    // Calculate risk levels and sort by risk priority
    const pigsWithRisk = filtered.map(pig => {
      const breed = breeds.find(b => b.id === pig.breed_id);
      if (!breed) return { ...pig, riskLevel: 'Low' as const };

      const pigRecords = records?.filter(r => r.pig_id === pig.id) || [];
      const pigChecklistRecords = checklistRecords?.filter(r => 
        pigRecords.some(pr => pr.id === r.monitoring_id)
      ) || [];

      const riskAnalysis = calculateRiskLevel(pigRecords, pigChecklistRecords, breed, pig.category);
      return { ...pig, riskLevel: riskAnalysis.riskLevel };
    });

    // Sort by risk level first, then by monitoring timing
    return sortPigs(pigsWithRisk.sort((a, b) => {
      const riskPriority = { High: 3, Moderate: 2, Low: 1 };
      return riskPriority[b.riskLevel] - riskPriority[a.riskLevel];
    }));
  }, [pigs, filterStatus, today, settings?.monitoring_start_time, breeds, records, checklistRecords]);

  const renderPigCard = (pig: Pig) => {
    const today = new Date().toISOString().split('T')[0];
    const monitoringTiming = calculateMonitoringTiming(
      pig.lastMonitoredTime && pig.lastMonitoredDate === today ? pig.lastMonitoredTime : null,
      settings?.monitoring_start_time || '08:00'
    );

    // Calculate risk level for the pig
    const breed = breeds.find(b => b.id === pig.breed_id);
    const pigRecords = records?.filter(r => r.pig_id === pig.id) || [];
    const pigChecklistRecords = checklistRecords?.filter(r => 
      pigRecords.some(pr => pr.id === r.monitoring_id)
    ) || [];

    const riskAnalysis = breed ? 
      calculateRiskLevel(pigRecords, pigChecklistRecords, breed, pig.category) :
      { riskLevel: 'Low' as RiskLevel };  // Type assertion here
    
    const riskColor = getRiskColor(riskAnalysis.riskLevel);

    const CardContent = ({ disabled = false }) => (
      <ThemedView style={[styles.pigCardContent, disabled && styles.pigCardDisabled]}>
        <ThemedView style={styles.pigImageWrapper}>
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
          <ThemedView style={[
            styles.statusIndicator,
            monitoringTiming.lastMonitoredTime ? styles.statusIndicatorMonitored : styles.statusIndicatorNotMonitored
          ]} />
        </ThemedView>

            <ThemedView style={styles.pigInfo}>
              <ThemedView style={styles.pigNameRow}>
            <ThemedView style={styles.nameAndRiskContainer}>
                <ThemedText style={styles.pigName} darkColor="#FFFFFF" lightColor="#000000">
                  {pig.name}
                </ThemedText>
            </ThemedView>

            <ThemedView style={[
                styles.riskBadge,
                riskAnalysis.riskLevel === 'High' ? styles.highRisk :
                riskAnalysis.riskLevel === 'Moderate' ? styles.moderateRisk :
                styles.healthy
              ]}>
                <IconSymbol 
                  name={riskAnalysis.riskLevel === 'Low' ? 'checkmark.circle.fill' : 'exclamationmark.triangle.fill'} 
                  size={12} 
                  color={riskColor} 
                />
                <ThemedText style={[styles.riskText, { color: riskColor }]}>
                  {riskAnalysis.riskLevel} Risk
                </ThemedText>
              </ThemedView>
            
                <ThemedView style={[
                  styles.monitoringBadge,
                  monitoringTiming.lastMonitoredTime ? styles.monitoredBadge : styles.notMonitoredBadge
                ]}>
                  <IconSymbol 
                    name={monitoringTiming.lastMonitoredTime ? "checkmark.circle.fill" : "exclamationmark.circle.fill"} 
                size={12} 
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

              <ThemedView style={styles.pigMetaInfo}>
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
            <ThemedText style={styles.breedName} darkColor="#8E8E93" lightColor="#8E8E93">
              {pig.breed_name}
                  </ThemedText>
                </ThemedView>

              <ThemedView style={styles.monitoringInfo}>
                {monitoringTiming.lastMonitoredTime ? (
                  <ThemedView style={styles.monitoringTimeContainer}>
                <ThemedText style={styles.monitoringTimeLabel}>
                  Last monitored: <ThemedText style={styles.monitoringTimeValue}>{monitoringTiming.lastMonitoredTime}</ThemedText>
                    </ThemedText>
                    {monitoringTiming.timeRemaining && (
                  <ThemedText style={[styles.monitoringTimeLabel, styles.nextMonitoringLabel]}>
                    Next: <ThemedText style={styles.nextMonitoringValue}>{monitoringTiming.timeRemaining}</ThemedText>
                  </ThemedText>
                )}
              </ThemedView>
            ) : (
              <ThemedText style={styles.monitoringTimeLabel}>
                {monitoringTiming.canMonitor ? 
                  'Ready for monitoring' : 
                  `Starts at ${monitoringTiming.nextMonitoringTime}`
                }
                </ThemedText>
            )}
                </ThemedView>
              </ThemedView>
            </ThemedView>
    );

    return (
      <ThemedView key={pig.id} style={styles.pigCard} darkColor="#1C1C1E" lightColor="#FFFFFF">
        {monitoringTiming.canMonitor ? (
          <Link
            href={{
              pathname: "/(pigs)/[id]/monitor" as const,
              params: { id: pig.id }
            }}
            style={styles.cardLink}
          >
            <CardContent />
          </Link>
        ) : (
          <CardContent disabled />
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

  const renderFloatingNotification = () => (
    <Link href="/(pigs)/notifications" asChild>
      <TouchableOpacity style={styles.floatingButton}>
        <ThemedView style={styles.notificationBadge}>
          <Ionicons name="notifications" size={24} color="#FFFFFF" />
        </ThemedView>
      </TouchableOpacity>
    </Link>
  );

  useEffect(() => {
    const setupNotifications = async () => {
      await registerForPushNotificationsAsync();
    };
    setupNotifications();
  }, []);

  useEffect(() => {
    if (pigs.length > 0 && breeds.length > 0 && records && checklistRecords) {
      scheduleRiskNotification(pigs, records, checklistRecords, breeds);
    }
  }, [pigs, breeds, records, checklistRecords]);

  return (
    <>
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
      {renderFloatingNotification()}
    </>
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
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  cardLink: {
    flex: 1,
  },
  pigCardContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  pigImageWrapper: {
    position: 'relative',
  },
  pigImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(142, 142, 147, 0.1)',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  statusIndicatorMonitored: {
    backgroundColor: '#30D158',
  },
  statusIndicatorNotMonitored: {
    backgroundColor: '#FF453A',
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
    fontSize: 24,
    fontWeight: '600',
  },
  pigInfo: {
    flex: 1,
    gap: 8,
  },
  pigNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  pigName: {
    fontSize: 18,
    fontWeight: '700',
    flexShrink: 1,
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
    fontSize: 11,
    fontWeight: '600',
  },
  monitoredText: {
    color: '#30D158',
  },
  notMonitoredText: {
    color: '#FF453A',
  },
  pigMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breedName: {
    fontSize: 13,
    opacity: 0.8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  adultBadge: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
  },
  youngBadge: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  adultText: {
    color: '#30D158',
  },
  youngText: {
    color: '#FF9500',
  },
  monitoringInfo: {
    marginTop: 4,
  },
  monitoringTimeContainer: {
    gap: 4,
  },
  monitoringTimeLabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  monitoringTimeValue: {
    color: '#007AFF',
    fontWeight: '500',
  },
  nextMonitoringLabel: {
    color: '#FF9500',
  },
  nextMonitoringValue: {
    color: '#FF9500',
    fontWeight: '500',
  },
  pigCardDisabled: {
    opacity: 0.7,
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
  nameAndRiskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  highRisk: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
  },
  moderateRisk: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
  },
  healthy: {
    backgroundColor: 'rgba(48, 209, 88, 0.1)',
  },
  riskText: {
    fontSize: 11,
    fontWeight: '600',
  },
  floatingButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 1000,
  },
  notificationBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
