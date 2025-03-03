import { StyleSheet, Dimensions, Image, ScrollView, ActivityIndicator, TouchableOpacity, View } from 'react-native';
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
import { registerForPushNotificationsAsync, scheduleRiskNotification, scheduleBackgroundHealthCheck, setupBackgroundNotificationHandler } from '@/utils/notifications';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  FadeIn, 
  SlideInRight,
  withSpring,
  useAnimatedStyle,
  withSequence,
  withDelay,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { formatInTimeZone } from 'date-fns-tz';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { TimeIntervalTriggerInput } from 'expo-notifications';

// Add this type definition at the top with other types
type MonitoringFilter = 'All' | 'Monitored' | 'Not Monitored';

// Add this type definition at the top
type RiskLevel = 'Low' | 'Moderate' | 'High';

// Add this type definition at the top with other types
type StatIcon = 'pawprint.fill' | 'checkmark.circle.fill' | 'exclamationmark.circle.fill';

interface StatCardProps {
  icon: StatIcon;
  number: number;
  label: string;
  delay?: number;
}

interface FilterButtonProps {
  type: MonitoringFilter;
  isActive: boolean;
  onPress: () => void;
  delay?: number;
}

interface CardContentProps {
  disabled?: boolean;
  pig: Pig;
  monitoringTiming: any;
  riskAnalysis: { riskLevel: RiskLevel };
  riskColor: string;
  settings: any;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const AnimatedStatCard: React.FC<StatCardProps> = ({ icon, number, label, delay = 0 }) => {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  useEffect(() => {
    scale.value = withSpring(1, { mass: 0.5 });
    opacity.value = withSpring(1);
  }, []);

  return (
    <Animated.View style={containerStyle}>
      <Animated.View style={[animatedStyle]}>
        <ThemedView style={styles.statCard}>
          <IconSymbol name={icon} size={32} color={icon === "pawprint.fill" ? "#FF9500" : icon === "checkmark.circle.fill" ? "#30D158" : "#FF453A"} />
          <ThemedText style={styles.statNumber} type="title">{number}</ThemedText>
          <ThemedText style={styles.statLabel}>{label}</ThemedText>
        </ThemedView>
      </Animated.View>
    </Animated.View>
  );
};

const AnimatedFilterButton: React.FC<FilterButtonProps> = ({ type, isActive, onPress, delay = 0 }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  useEffect(() => {
    opacity.value = withDelay(delay, withSpring(1));
  }, []);

  const onPressIn = () => {
    scale.value = withSpring(0.95);
  };

  const onPressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View style={containerStyle}>
      <Animated.View style={scaleStyle}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={[
            styles.filterButton,
            isActive && styles.filterButtonActive,
          ]}
        >
          <IconSymbol
            name={type === 'All' ? 'list.bullet' : type === 'Monitored' ? 'checkmark.circle.fill' : 'exclamationmark.circle.fill'}
            size={16}
            color={isActive ? '#007AFF' : '#8E8E93'}
          />
          <ThemedText style={[
            styles.filterButtonText,
            isActive && styles.filterButtonTextActive
          ]}>
            {type}
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const CardContent: React.FC<CardContentProps> = ({ disabled = false, pig, monitoringTiming, riskAnalysis, riskColor, settings }) => (
  <Animated.View 
    entering={FadeInUp.delay(100).duration(600).springify()}
    style={[styles.pigCardContent, disabled && styles.pigCardDisabled]}
  >
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
  </Animated.View>
);

const TIMEZONE = 'Asia/Singapore';

export default function DashboardScreen() {
  const { pigs, isLoading, error, refreshPigs } = usePigs();
  const { settings, refreshSettings } = useSettings();
  const { breeds } = useBreeds();
  const { records, checklistRecords, refreshRecords } = useMonitoring();
  const [filterStatus, setFilterStatus] = useState<MonitoringFilter>('All');
  const [forceUpdate, setForceUpdate] = useState(0);

  // Add timer to update countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setForceUpdate(prev => prev + 1);
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Add app state listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        refreshPigs();
        refreshSettings();
        refreshRecords();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Schedule next monitoring notifications
  useEffect(() => {
    const scheduleNextMonitoring = async () => {
      try {
        await Notifications.cancelScheduledNotificationAsync('next-monitoring');
        
        const now = new Date();
        const startTime = settings?.monitoring_start_time || '08:00';
        const [hours, minutes] = startTime.split(':').map(Number);
        const nextMonitoring = new Date(now);
        nextMonitoring.setHours(hours, minutes, 0, 0);

        if (nextMonitoring.getTime() < now.getTime()) {
          nextMonitoring.setDate(nextMonitoring.getDate() + 1);
        }

        const secondsUntilNext = Math.floor((nextMonitoring.getTime() - now.getTime()) / 1000);

        await Notifications.scheduleNotificationAsync({
          identifier: 'next-monitoring',
          content: {
            title: '🕒 Monitoring Time',
            body: 'Time to start monitoring your pigs',
          },
          trigger: {
            type: 'timeInterval',
            seconds: secondsUntilNext,
            repeats: true
          } as TimeIntervalTriggerInput
        });
      } catch (error) {
        console.error('Error scheduling monitoring notification:', error);
      }
    };

    if (settings?.monitoring_start_time) {
      scheduleNextMonitoring();
    }
  }, [settings?.monitoring_start_time]);

  useFocusEffect(
    useCallback(() => {
      const refreshData = async () => {
        try {
          await Promise.all([
            refreshPigs(),
            refreshSettings(),
            refreshRecords(),
          ]);
          
          if (pigs.length > 0 && breeds.length > 0 && records && checklistRecords) {
            await scheduleRiskNotification(pigs, records, checklistRecords, breeds);
          }
        } catch (error) {
          console.error('Error refreshing dashboard data:', error);
        }
      };

      refreshData();
    }, [refreshPigs, refreshSettings, refreshRecords])
  );

  const today = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');
  const monitoredCount = pigs.filter(pig => 
    pig.lastMonitoredDate === today
  ).length;
  const notMonitoredCount = pigs.length - monitoredCount;

  const sortPigs = (pigsToSort: Pig[]) => {
    const today = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');
    
    return pigsToSort.sort((a, b) => {
      const timingA = calculateMonitoringTiming(
        a.lastMonitoredTime && a.lastMonitoredDate === today ? a.lastMonitoredTime : null,
        settings?.monitoring_start_time || '08:00'
      );
      const timingB = calculateMonitoringTiming(
        b.lastMonitoredTime && b.lastMonitoredDate === today ? b.lastMonitoredTime : null,
        settings?.monitoring_start_time || '08:00'
      );

      // First priority: Can monitor
      if (timingA.canMonitor !== timingB.canMonitor) {
        return timingA.canMonitor ? -1 : 1;
      }

      // Second priority: Next monitoring time
      if (timingA.timeRemaining && timingB.timeRemaining) {
        const timeA = new Date(`2000/01/01 ${timingA.nextMonitoringTime}`).getTime();
        const timeB = new Date(`2000/01/01 ${timingB.nextMonitoringTime}`).getTime();
        return timeA - timeB;
      }

      return 0;
    });
  };

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

    return sortPigs(pigsWithRisk.sort((a, b) => {
      const riskPriority = { High: 3, Moderate: 2, Low: 1 };
      return (riskPriority[b.riskLevel as RiskLevel] || 0) - (riskPriority[a.riskLevel as RiskLevel] || 0);
    }));
  }, [pigs, filterStatus, today, settings?.monitoring_start_time, breeds, records, checklistRecords]);

  const renderPigCard = (pig: Pig) => {
    const today = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');
    const monitoringTiming = calculateMonitoringTiming(
      pig.lastMonitoredTime && pig.lastMonitoredDate === today ? pig.lastMonitoredTime : null,
      settings?.monitoring_start_time || '08:00'
    );

    const breed = breeds.find(b => b.id === pig.breed_id);
    const pigRecords = records?.filter(r => r.pig_id === pig.id) || [];
    const pigChecklistRecords = checklistRecords?.filter(r => 
      pigRecords.some(pr => pr.id === r.monitoring_id)
    ) || [];

    const riskAnalysis = breed ? 
      calculateRiskLevel(pigRecords, pigChecklistRecords, breed, pig.category) :
      { riskLevel: 'Low' as RiskLevel };
    
    const riskColor = getRiskColor(riskAnalysis.riskLevel);

    return (
      <ThemedView key={pig.id} style={styles.pigCard}>
        {monitoringTiming.canMonitor ? (
          <Link
            href={{
              pathname: "/(pigs)/[id]/monitor" as const,
              params: { id: pig.id }
            }}
            style={styles.cardLink}
          >
            <CardContent 
              pig={pig}
              monitoringTiming={monitoringTiming}
              riskAnalysis={riskAnalysis}
              riskColor={riskColor}
              settings={settings}
            />
          </Link>
        ) : (
          <CardContent 
            disabled
            pig={pig}
            monitoringTiming={monitoringTiming}
            riskAnalysis={riskAnalysis}
            riskColor={riskColor}
            settings={settings}
          />
        )}
      </ThemedView>
    );
  };

  // Update the filter buttons section
  const renderFilterButtons = () => (
    <ThemedView style={styles.filterContainer}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>Filter Status</ThemedText>
      <ThemedView style={styles.filterButtons}>
        {(['All', 'Monitored', 'Not Monitored'] as MonitoringFilter[]).map((status, index) => (
          <AnimatedFilterButton
            key={status}
            type={status}
            isActive={filterStatus === status}
            onPress={() => setFilterStatus(status)}
            delay={index * 100}
          />
        ))}
      </ThemedView>
    </ThemedView>
  );

  const renderFloatingNotification = () => {
    const riskPigsCount = pigs.reduce((count, pig) => {
      const breed = breeds.find(b => b.id === pig.breed_id);
      if (!breed) return count;

      const pigRecords = records?.filter(r => r.pig_id === pig.id) || [];
      const pigChecklistRecords = checklistRecords?.filter(r => 
        pigRecords.some(pr => pr.id === r.monitoring_id)
      ) || [];

      const riskAnalysis = calculateRiskLevel(pigRecords, pigChecklistRecords, breed, pig.category);
      return ['High', 'Moderate'].includes(riskAnalysis.riskLevel) ? count + 1 : count;
    }, 0);

  return (
      <Link href="/(pigs)/notifications" asChild>
        <TouchableOpacity style={styles.floatingButton}>
          <ThemedView style={styles.notificationBadge}>
            <Ionicons name="notifications" size={24} color="#FFFFFF" />
            {riskPigsCount > 0 && (
              <ThemedView style={styles.notificationCount}>
                <ThemedText style={styles.notificationCountText}>
                  {riskPigsCount}
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        </TouchableOpacity>
      </Link>
    );
  };

  useEffect(() => {
    const setupNotifications = async () => {
      try {
        // Only request notification permissions and set up channels
        const permission = await registerForPushNotificationsAsync();
        if (!permission) {
          console.log('No notification permission');
          return;
        }

        // Set up notification handler for local notifications
        setupBackgroundNotificationHandler();

        // Schedule local notifications if we have data
        if (pigs.length > 0 && breeds.length > 0 && records && checklistRecords) {
          await Promise.all([
            scheduleBackgroundHealthCheck(pigs, records, checklistRecords, breeds),
            scheduleRiskNotification(pigs, records, checklistRecords, breeds),
          ]);
        }
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    };
    
    setupNotifications();
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
            <ThemedText style={styles.headerTitle}>Thermo Track</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              African Swine Fever Monitoring System
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.headerBadge}>
            <IconSymbol name="wifi.slash" size={16} color="#FF9500" />
            <ThemedText style={styles.headerBadgeText}>Offline Mode</ThemedText>
          </ThemedView>
        </ThemedView>
        }
      >
      <ThemedView style={styles.statsContainer}>
          <AnimatedStatCard
            icon="pawprint.fill"
            number={pigs.length}
            label="Total Pigs"
            delay={0}
          />
          <AnimatedStatCard
            icon="checkmark.circle.fill"
            number={monitoredCount}
            label="Monitored"
            delay={100}
          />
          <AnimatedStatCard
            icon="exclamationmark.circle.fill"
            number={notMonitoredCount}
            label="Not Monitored"
            delay={200}
          />
      </ThemedView>

      {renderFilterButtons()}

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
              {filteredPigs.map((pig) => renderPigCard(pig))}
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
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.1)',
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
    borderWidth: 1,
  },
  monitoredBadge: {
    backgroundColor: 'rgba(48, 209, 88, 0.1)',
    borderColor: 'rgba(48, 209, 88, 0.3)',
  },
  notMonitoredBadge: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderColor: 'rgba(255, 69, 58, 0.3)',
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
    borderWidth: 1,
  },
  adultBadge: {
    backgroundColor: 'rgba(48, 209, 88, 0.1)',
    borderColor: 'rgba(48, 209, 88, 0.3)',
  },
  youngBadge: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderColor: 'rgba(255, 149, 0, 0.3)',
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
    opacity: 0.5,
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
    borderWidth: 1,
  },
  highRisk: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  moderateRisk: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  healthy: {
    backgroundColor: 'rgba(48, 209, 88, 0.1)',
    borderColor: 'rgba(48, 209, 88, 0.3)',
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
  notificationCount: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
