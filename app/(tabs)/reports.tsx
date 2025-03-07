import React from 'react';
import { useState, useCallback } from 'react';
import { StyleSheet, Dimensions, Image, ScrollView, ActivityIndicator } from 'react-native';
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
        headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
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
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
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
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#8E8E93',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 