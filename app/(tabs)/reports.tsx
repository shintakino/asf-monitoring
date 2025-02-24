import { useState, useCallback } from 'react';
import { StyleSheet, Dimensions, Image, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { usePigs } from '@/hooks/usePigs';
import type { Pig } from '@/utils/database';
import { Link } from 'expo-router';
import { useMonitoring } from '@/hooks/useMonitoring';

type ReportFilter = 'All' | 'High Risk' | 'Moderate' | 'Healthy';

export default function ReportsScreen() {
  const { pigs, isLoading, error, refreshPigs } = usePigs();
  const { checklistRecords } = useMonitoring();
  const [filterStatus, setFilterStatus] = useState<ReportFilter>('All');

  useFocusEffect(
    useCallback(() => {
      refreshPigs();
    }, [refreshPigs])
  );

  const renderHeader = () => (
        <ThemedView style={styles.headerContent}>
          <Image 
            source={require('@/assets/images/pig.png')}
            style={styles.headerIcon}
          />
          <ThemedView style={styles.headerTextContainer}>
        <ThemedText style={styles.headerTitle}>Reports</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
          View health monitoring reports
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.headerBadge}>
        <IconSymbol name="chart.bar.fill" size={16} color="#007AFF" />
        <ThemedText style={styles.headerBadgeText}>Health Analytics</ThemedText>
      </ThemedView>
    </ThemedView>
  );

  const renderFilterChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
      <ThemedView style={styles.filterChips}>
        {(['All', 'High Risk', 'Moderate', 'Healthy'] as ReportFilter[]).map((status) => (
          <ThemedView
            key={status}
            style={[styles.chip, filterStatus === status && styles.chipActive]}
            onTouchEnd={() => setFilterStatus(status)}
          >
            <ThemedText style={[styles.chipText, filterStatus === status && styles.chipTextActive]}>
              {status}
            </ThemedText>
          </ThemedView>
        ))}
      </ThemedView>
    </ScrollView>
  );

  const renderPigHealthCard = (pig: Pig) => {
    const symptomsCount = checklistRecords?.filter(r => r.checked).length || 0;

    return (
      <Link
        href={{
          pathname: "/(pigs)/[id]/report" as const,
          params: { id: pig.id }
        }}
        key={pig.id}
        style={styles.healthCardLink}
      >
        <ThemedView style={styles.healthCard}>
          <ThemedView style={styles.healthCardHeader}>
            <ThemedView style={styles.pigBasicInfo}>
              <ThemedView style={styles.pigImageContainer}>
                {pig.image ? (
                  <Image source={{ uri: pig.image }} style={styles.pigImage} />
                ) : (
                  <ThemedView style={styles.pigImagePlaceholder}>
                    <ThemedText style={styles.pigImageInitial}>
                      {pig.name.charAt(0).toUpperCase()}
                    </ThemedText>
                  </ThemedView>
                )}
              </ThemedView>
              <ThemedView>
                <ThemedText style={styles.pigName}>{pig.name}</ThemedText>
                <ThemedText style={styles.pigBreed}>{pig.breed_name}</ThemedText>
              </ThemedView>
            </ThemedView>
            <ThemedView style={[styles.riskBadge, styles.moderateRisk]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#FF9500" />
              <ThemedText style={styles.riskText}>Moderate Risk</ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.healthDetails}>
            <ThemedView style={styles.temperatureRow}>
              <ThemedText style={styles.detailLabel}>Last Temperature</ThemedText>
              <ThemedText style={styles.temperatureValue}>39.5°C</ThemedText>
            </ThemedView>
            
            <ThemedView style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Symptoms Found:</ThemedText>
              <ThemedView style={styles.symptomsCount}>
                <ThemedText style={styles.detailValue}>
                  {symptomsCount} {symptomsCount === 1 ? 'Symptom' : 'Symptoms'}
                </ThemedText>
                <IconSymbol 
                  name="exclamationmark.circle.fill" 
                  size={16} 
                  color={symptomsCount > 0 ? '#FF453A' : '#30D158'} 
                />
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Last Monitored</ThemedText>
              <ThemedText style={styles.detailValue}>Today at 8:30 AM</ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </Link>
    );
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={renderHeader()}
    >
      <ThemedView style={styles.container}>
        {renderFilterChips()}
        <ScrollView style={styles.healthCardsList}>
          {pigs.map(renderPigHealthCard)}
        </ScrollView>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
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
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginTop: 0,
  },
  headerBadgeText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
  },
  chipActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#007AFF',
  },
  healthCardsList: {
    flex: 1,
  },
  healthCard: {
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  healthCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pigBasicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: 'rgba(142, 142, 147, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pigImageInitial: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
  },
  pigName: {
    fontSize: 17,
    fontWeight: '600',
  },
  pigBreed: {
    fontSize: 14,
    color: '#8E8E93',
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
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9500',
  },
  healthDetails: {
    gap: 12,
    backgroundColor: 'rgba(142, 142, 147, 0.06)',
    padding: 12,
    borderRadius: 12,
  },
  temperatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(142, 142, 147, 0.1)',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '400',
  },
  temperatureValue: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FF9500',
  },
  symptomsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  healthCardLink: {
    marginBottom: 12,
  },
}); 