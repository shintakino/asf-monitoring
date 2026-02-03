import React from 'react';
import { useState, useCallback } from 'react';
import { StyleSheet, Dimensions, Image, ScrollView, ActivityIndicator, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { usePigs } from '@/hooks/usePigs';
import { useBreeds } from '@/hooks/useBreeds';
import type { Pig } from '@/utils/database';
import { Link } from 'expo-router';
import { useMonitoring } from '@/hooks/useMonitoring';
import { calculateRiskLevel, getRiskColor } from '@/utils/risk';
import { format, parseISO } from 'date-fns';

type ReportFilter = 'All' | 'High Risk' | 'Moderate' | 'Healthy';

export default function ReportsScreen() {
  const { pigs, isLoading: pigsLoading, error: pigsError, refreshPigs } = usePigs();
  const { breeds } = useBreeds();
  const { records, checklistRecords, refreshRecords } = useMonitoring();
  const [filterStatus, setFilterStatus] = useState<ReportFilter>('All');

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <Image
        source={require('@/assets/images/pig.png')}
        style={styles.headerIcon}
      />
      <View style={styles.headerTextContainer}>
        <ThemedText style={styles.headerTitle}>Reports</ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          View health monitoring reports
        </ThemedText>
      </View>
      <View style={styles.headerBadge}>
        <IconSymbol name="chart.bar.fill" size={16} color="#007AFF" />
        <ThemedText style={styles.headerBadgeText}>Health Analytics</ThemedText>
      </View>
    </View>
  );

  useFocusEffect(
    useCallback(() => {
      const refreshData = async () => {
        console.log('Refreshing data...');
        await Promise.all([
          refreshPigs(),
          refreshRecords(),
        ]);
        console.log('Pigs:', pigs.length);
        console.log('Records:', records?.length);
        console.log('Breeds:', breeds.length);
      };
      refreshData();
    }, [refreshPigs, refreshRecords])
  );

  // Add loading state handling
  if (pigsLoading) {
    return (
      <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </ThemedView>
    );
  }

  // Add error state handling
  if (pigsError) {
    return (
      <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ThemedText style={{ color: 'red' }}>Error loading pigs: {pigsError.message}</ThemedText>
      </ThemedView>
    );
  }

  // Add empty state handling
  if (pigs.length === 0) {
    return (
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#6366F1', dark: '#1E293B' }}
        headerImage={renderHeader()}
      >
        <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ThemedText style={styles.emptyText}>No pigs found. Add some pigs to see their health reports.</ThemedText>
          <Link href="/(pigs)/new" style={styles.addButton}>
            <ThemedText style={styles.addButtonText}>Add New Pig</ThemedText>
          </Link>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  // Filter pigs based on their risk level
  const filteredPigs = pigs.filter(pig => {
    if (filterStatus === 'All') return true;

    const breed = breeds.find(b => b.id === pig.breed_id);
    if (!breed) return false;

    const pigRecords = records?.filter(r => r.pig_id === pig.id) || [];
    const pigChecklistRecords = checklistRecords?.filter(r =>
      pigRecords.some(pr => pr.id === r.monitoring_id)
    ) || [];

    const riskAnalysis = calculateRiskLevel(pigRecords, pigChecklistRecords, breed, pig.category);

    switch (filterStatus) {
      case 'High Risk': return riskAnalysis.riskLevel === 'High';
      case 'Moderate': return riskAnalysis.riskLevel === 'Moderate';
      case 'Healthy': return riskAnalysis.riskLevel === 'Low';
      default: return true;
    }
  });

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
    const breed = breeds.find(b => b.id === pig.breed_id);
    if (!breed) return null;

    // Get pig-specific records
    const pigRecords = records?.filter(r => r.pig_id === pig.id) || [];
    const latestRecord = pigRecords[0];

    const pigChecklistRecords = checklistRecords?.filter(r =>
      pigRecords.some(pr => pr.id === r.monitoring_id)
    ) || [];

    const symptomsCount = pigChecklistRecords.filter(r => r.checked).length;
    const riskAnalysis = calculateRiskLevel(pigRecords, pigChecklistRecords, breed, pig.category);
    const riskColor = getRiskColor(riskAnalysis.riskLevel);

    // Calculate temperature-specific risk color
    const getTemperatureRiskColor = () => {
      if (!latestRecord) return '#8E8E93';
      const minTemp = pig.category === 'Adult' ? breed.min_temp_adult : breed.min_temp_young;
      const maxTemp = pig.category === 'Adult' ? breed.max_temp_adult : breed.max_temp_young;
      const tempDeviation = Math.max(
        latestRecord.temperature - maxTemp,
        minTemp - latestRecord.temperature,
        0
      );

      if (tempDeviation >= 1.5) return getRiskColor('High');
      if (tempDeviation >= 1.0) return getRiskColor('Moderate');
      if (tempDeviation >= 0.5) return getRiskColor('Moderate');
      return getRiskColor('Low');
    };

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
                <ThemedText style={styles.pigBreed}>{breed.name}</ThemedText>
              </ThemedView>
            </ThemedView>
            <ThemedView style={[
              styles.riskBadge,
              riskAnalysis.riskLevel === 'High' ? styles.highRisk :
                riskAnalysis.riskLevel === 'Moderate' ? styles.moderateRisk :
                  styles.healthy
            ]}>
              <IconSymbol
                name={riskAnalysis.riskLevel === 'Low' ? 'checkmark.circle.fill' : 'exclamationmark.triangle.fill'}
                size={16}
                color={riskColor}
              />
              <ThemedText style={[styles.riskText, { color: riskColor }]}>
                {riskAnalysis.riskLevel} Risk
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.healthDetails}>
            <ThemedView style={styles.temperatureRow}>
              <ThemedText style={styles.detailLabel}>Last Temperature</ThemedText>
              <ThemedText style={[
                styles.temperatureValue,
                { color: getTemperatureRiskColor() }
              ]}>
                {latestRecord ? `${latestRecord.temperature}°C` : 'N/A'}
              </ThemedText>
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
              <ThemedText style={styles.detailValue}>
                {latestRecord ? format(parseISO(latestRecord.date), 'MMM d, yyyy') : 'Never'}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </Link>
    );
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#6366F1', dark: '#1E293B' }}
      headerImage={renderHeader()}
    >
      <ThemedView style={styles.container}>
        {renderFilterChips()}
        <ScrollView style={styles.healthCardsList}>
          {filteredPigs.map(renderPigHealthCard)}
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
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 16,
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 8,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerTextContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 24,
    gap: 6,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerBadgeText: {
    fontSize: 13,
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
    borderRadius: 20,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#6366F1', // Indigo 500
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B', // Slate 500
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  healthCardsList: {
    flex: 1,
  },
  healthCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
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
    borderWidth: 2,
    borderColor: 'rgba(142, 142, 147, 0.1)',
  },
  pigImage: {
    width: '100%',
    height: '100%',
  },
  pigImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9', // Slate 100
    justifyContent: 'center',
    alignItems: 'center',
  },
  pigImageInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748B', // Slate 500
  },
  pigName: {
    fontSize: 17,
    fontWeight: '700',
  },
  pigBreed: {
    fontSize: 14,
    color: '#64748B', // Slate 500
    fontWeight: '500',
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  highRisk: {
    backgroundColor: '#FEF2F2',
  },
  moderateRisk: {
    backgroundColor: '#FFFBEB',
  },
  healthy: {
    backgroundColor: '#ECFDF5',
  },
  riskText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  healthDetails: {
    gap: 12,
    backgroundColor: 'rgba(142, 142, 147, 0.04)',
    padding: 16,
    borderRadius: 16,
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
    color: '#64748B', // Slate 500
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A', // Slate 900
  },
  temperatureValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F59E0B',
  },
  symptomsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  healthCardLink: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#64748B', // Slate 500
    lineHeight: 24,
  },
  addButton: {
    backgroundColor: '#6366F1', // Indigo 500
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 