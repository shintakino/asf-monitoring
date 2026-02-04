// Imports and Setup (Keep imports, removing ParallaxScrollView)
import { StyleSheet, Dimensions, Image, ScrollView, ActivityIndicator, TouchableOpacity, View, Platform, StatusBar } from 'react-native';
import { Colors } from '@/constants/Colors';
import React, { useEffect } from 'react';
import { Link } from 'expo-router';
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
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { registerForPushNotificationsAsync, scheduleRiskNotification, scheduleBackgroundHealthCheck, setupBackgroundNotificationHandler } from '@/utils/notifications';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import { formatInTimeZone } from 'date-fns-tz';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { TimeIntervalTriggerInput } from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ... (Types remain the same)
type MonitoringFilter = 'All' | 'Monitored' | 'Not Monitored';
type RiskLevel = 'Low' | 'Moderate' | 'High';
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
  settings: any;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// ... (AnimatedStatCard remains similar, but updated styles)
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
    <Animated.View style={[containerStyle, { flex: 1 }]}>
      <Animated.View style={[animatedStyle, { flex: 1 }]}>
        <ThemedView
          style={styles.statCard}
          lightColor="#FFFFFF"
          darkColor="#1E293B"
        >
          <View style={[styles.statIconContainer, { backgroundColor: icon === "pawprint.fill" ? '#FFEDD5' : icon === "checkmark.circle.fill" ? '#DCFCE7' : '#FEE2E2' }]}>
            {/* Using custom light background colors based on semantic colors */}
            <IconSymbol
              name={icon}
              size={24}
              color={icon === "pawprint.fill" ? '#F97316' : icon === "checkmark.circle.fill" ? '#10B981' : '#EF4444'}
            />
          </View>
          <View style={styles.statTextContainer}>
            <ThemedText style={styles.statNumber} type="title">{number}</ThemedText>
            <ThemedText style={styles.statLabel} type="caption">{label}</ThemedText>
          </View>
        </ThemedView>
      </Animated.View>
    </Animated.View>
  );
};

// ... (AnimatedFilterButton updated styles)
const AnimatedFilterButton: React.FC<FilterButtonProps> = ({ type, isActive, onPress, delay = 0 }) => {
  // ... (Keep implementation logic)
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { mass: 0.5 }));
    opacity.value = withDelay(delay, withSpring(1));
  }, []);

  return (
    <AnimatedTouchableOpacity
      onPress={onPress}
      style={[
        styles.filterButton,
        isActive && styles.filterButtonActive,
        animatedStyle
      ]}
    >
      {type !== 'All' && (
        <IconSymbol
          name={type === 'Monitored' ? 'checkmark.circle.fill' : 'exclamationmark.triangle.fill'}
          size={14}
          color={isActive ? '#FFFFFF' : '#64748B'}
          style={{ marginRight: 6 }}
        />
      )}

      <ThemedText style={[
        styles.filterButtonText,
        isActive && styles.filterButtonTextActive
      ]}>
        {type}
      </ThemedText>
    </AnimatedTouchableOpacity>
  );
};


// ... (CardContent heavily redesigned)
const CardContent: React.FC<CardContentProps> = ({ disabled = false, pig, monitoringTiming, riskAnalysis, settings }) => (
  <Animated.View
    entering={FadeInUp.delay(100).duration(600).springify()}
    style={[styles.pigCardContent, disabled && styles.pigCardDisabled]}
  >
    <View style={styles.pigCardHeader}>
      <View style={styles.pigAvatarContainer}>
        <ThemedText style={styles.pigAvatarText}>{pig.name.charAt(0).toUpperCase()}</ThemedText>
      </View>
      {monitoringTiming.lastMonitoredTime ? null : (
        <View style={styles.statusDot} />
      )}
    </View>

    <View style={styles.pigCardBody}>
      <View style={styles.pigCardTopRow}>
        <ThemedText style={styles.pigName} type="subtitle">{pig.name}</ThemedText>
        <View style={[styles.riskBadge, riskAnalysis.riskLevel === 'Low' ? styles.riskBadgeLow : styles.riskBadgeHigh]}>
          <IconSymbol name={riskAnalysis.riskLevel === 'Low' ? 'checkmark.shield.fill' : 'exclamationmark.triangle.fill'} size={12} color={riskAnalysis.riskLevel === 'Low' ? '#10B981' : '#EF4444'} />
          <ThemedText style={[styles.riskBadgeText, { color: riskAnalysis.riskLevel === 'Low' ? '#10B981' : '#EF4444' }]}>{riskAnalysis.riskLevel} Risk</ThemedText>
        </View>
      </View>

      <View style={styles.pigCardStatusRow}>
        {!monitoringTiming.lastMonitoredTime && (
          <View style={styles.notMonitoredTag}>
            <IconSymbol name="exclamationmark.triangle.fill" size={12} color="#EF4444" />
            <ThemedText style={styles.notMonitoredText}>Not Monitored</ThemedText>
          </View>
        )}
      </View>

      <View style={styles.pigDetailsRow}>
        <View style={styles.pigDetailItem}>
          <IconSymbol name="calendar" size={14} color="#94A3B8" />
          {/* Assuming calendar maps to something valid or use mapping fallback */}
          <ThemedText style={styles.pigDetailText}>{pig.category}</ThemedText>
        </View>
        <ThemedText style={styles.pigDetailSeparator}>•</ThemedText>
        <View style={styles.pigDetailItem}>
          <IconSymbol name="pawprint.fill" size={14} color="#94A3B8" />
          <ThemedText style={styles.pigDetailText}>{pig.breed_name}</ThemedText>
        </View>
      </View>

      <View style={styles.pigCardFooter}>
        <View style={styles.monitoringStatusContainer}>
          <View style={[styles.monitoringDot, monitoringTiming.lastMonitoredTime ? styles.monitoringDotActive : styles.monitoringDotInactive]} />
          <ThemedText style={styles.monitoringStatusText}>
            {monitoringTiming.lastMonitoredTime
              ? `Monitored at ${monitoringTiming.lastMonitoredTime}`
              : `Monitoring ${monitoringTiming.canMonitor ? 'is ready' : `starts at ${monitoringTiming.nextMonitoringTime}`}`
            }
          </ThemedText>
        </View>
        <IconSymbol name="ellipsis" size={20} color="#CBD5E1" />
      </View>

    </View>
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
  const insets = useSafeAreaInsets();

  // ... (useEffect Hooks - Keep logic same)
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
    return () => { subscription.remove(); };
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
  const monitoredCount = pigs.filter(pig => pig.lastMonitoredDate === today).length;
  const notMonitoredCount = pigs.length - monitoredCount;
  // const alertsCount = pigs.filter... logic for alerts (high risk)

  const alertsCount = useMemo(() => {
    return pigs.reduce((count, pig) => {
      const breed = breeds.find(b => b.id === pig.breed_id);
      if (!breed) return count;
      const pigRecords = records?.filter(r => r.pig_id === pig.id) || [];
      const pigChecklistRecords = checklistRecords?.filter(r =>
        pigRecords.some(pr => pr.id === r.monitoring_id)
      ) || [];
      const riskAnalysis = calculateRiskLevel(pigRecords, pigChecklistRecords, breed, pig.category);
      return ['High', 'Moderate'].includes(riskAnalysis.riskLevel) ? count + 1 : count;
    }, 0);
  }, [pigs, breeds, records, checklistRecords]);


  // ... (sortPigs and filteredPigs logic - Keep same)
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
    // ... (Keep logic for data prep)

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

    return (
      <ThemedView key={pig.id} style={styles.pigCardContainer}>
        {monitoringTiming.canMonitor ? (
          <Link
            href={{
              pathname: "/(pigs)/[id]/monitor" as const,
              params: { id: pig.id }
            }}
            style={{ width: '100%' }}
          >
            <CardContent
              pig={pig}
              monitoringTiming={monitoringTiming}
              riskAnalysis={riskAnalysis}
              settings={settings}
            />
          </Link>
        ) : (
          <CardContent
            disabled
            pig={pig}
            monitoringTiming={monitoringTiming}
            riskAnalysis={riskAnalysis}
            settings={settings}
          />
        )}
      </ThemedView>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#6366F1', '#4338CA']} // Indigo 500 to Indigo 700
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View style={styles.headerLeft}>
                <Image source={require('@/assets/images/pig.png')} style={styles.avatarImage} />
                <View>
                  <ThemedText style={styles.headerTitle}>Thermo Track</ThemedText>
                  <ThemedText style={styles.headerSubtitle}>ASF MONITORING SYSTEM</ThemedText>
                </View>
              </View>
              <Link href="/(pigs)/notifications" asChild>
                <TouchableOpacity style={styles.notificationButton}>
                  <IconSymbol name="bell.fill" size={24} color="#FFFFFF" />
                  {alertsCount > 0 && <View style={styles.notificationBadge} />}
                </TouchableOpacity>
              </Link>
            </View>

            <View style={styles.offlinePill}>
              <IconSymbol name="wifi.slash" size={14} color="#F59E0B" />
              <ThemedText style={styles.offlineText}>Offline Mode</ThemedText>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.statsRowOverlap}>
          <AnimatedStatCard icon="pawprint.fill" number={pigs.length} label="Total Pigs" delay={0} />
          <AnimatedStatCard icon="checkmark.circle.fill" number={monitoredCount} label="Monitored" delay={100} />
          <AnimatedStatCard icon="exclamationmark.circle.fill" number={alertsCount} label="Alerts" delay={200} />
        </View>

        <View style={styles.bodyContent}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Filter Status</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {(['All', 'Monitored', 'Not Monitored'] as MonitoringFilter[]).map((status, index) => (
              <View key={status} style={{ marginRight: 8 }}>
                <AnimatedFilterButton
                  type={status}
                  isActive={filterStatus === status}
                  onPress={() => setFilterStatus(status)}
                  delay={index * 100}
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.pigListSection}>
            <View style={styles.pigListHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>Pig Profiles ({filteredPigs.length})</ThemedText>
              {filteredPigs.length > 3 && <TouchableOpacity><ThemedText style={styles.viewAllText}>View All {'›'}</ThemedText></TouchableOpacity>}
            </View>

            {isLoading ? (
              <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 20 }} />
            ) : filteredPigs.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText>No pigs found.</ThemedText>
              </View>
            ) : (
              <View style={styles.pigsList}>
                {filteredPigs.map(pig => renderPigCard(pig))}
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}


const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 80, // Extra padding for overlap
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    gap: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#6366F1',
  },
  offlinePill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  statsRowOverlap: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: -50,
    gap: 12,
  },
  statCard: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
    gap: 12,
    height: 140, // Fixed height for uniformity
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24, // Circle
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statTextContainer: {
    alignItems: 'center',
    gap: 2,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  bodyContent: {
    paddingTop: 30, // Spacing from stats
    paddingHorizontal: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 20,
    marginBottom: 12,
  },
  filterScroll: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  pigListSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  pigListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    color: '#6366F1',
    fontWeight: '600',
    fontSize: 14,
  },
  pigsList: {
    gap: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
  },
  // Card Styles
  pigCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  pigCardContent: {
    padding: 20,
  },
  pigCardDisabled: {
    opacity: 0.7,
  },
  pigCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pigAvatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#F1F5F9', // Light gray bg
    alignItems: 'center',
    justifyContent: 'center',
  },
  pigAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366F1',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'absolute',
    right: -2,
    top: -2,
  },
  pigCardBody: {
    gap: 10,
  },
  pigCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pigName: {
    fontSize: 20,
    fontWeight: '700',
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
  },
  riskBadgeLow: {
    backgroundColor: '#ECFDF5',
  },
  riskBadgeHigh: {
    backgroundColor: '#FEF2F2',
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pigCardStatusRow: {
    minHeight: 24,
  },
  notMonitoredTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  notMonitoredText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  pigDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  pigDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pigDetailText: {
    color: '#64748B',
    fontSize: 14,
  },
  pigDetailSeparator: {
    color: '#CBD5E1',
  },
  pigCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  monitoringStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monitoringDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  monitoringDotActive: {
    backgroundColor: '#10B981',
  },
  monitoringDotInactive: {
    backgroundColor: '#F87171',
  },
  monitoringStatusText: {
    color: '#64748B',
    fontSize: 13,
  },
});
