import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { usePigs } from '@/hooks/usePigs';
import { useBreeds } from '@/hooks/useBreeds';
import { useMonitoring } from '@/hooks/useMonitoring';
import { calculateRiskLevel, getRiskColor } from '@/utils/risk';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Link } from 'expo-router';

export default function NotificationsScreen() {
  const { pigs } = usePigs();
  const { breeds } = useBreeds();
  const { records, checklistRecords } = useMonitoring();

  // Filter pigs with risks
  const riskPigs = pigs.filter(pig => {
    const breed = breeds.find(b => b.id === pig.breed_id);
    if (!breed) return false;

    const pigRecords = records?.filter(r => r.pig_id === pig.id) || [];
    const pigChecklistRecords = checklistRecords?.filter(r => 
      pigRecords.some(pr => pr.id === r.monitoring_id)
    ) || [];

    const riskAnalysis = calculateRiskLevel(pigRecords, pigChecklistRecords, breed, pig.category);
    return ['High', 'Moderate'].includes(riskAnalysis.riskLevel);
  });

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headerTop}>
          <ThemedText style={styles.title}>Alerts</ThemedText>
          <ThemedView style={styles.headerBadge}>
            <IconSymbol name="bell.badge.fill" size={20} color="#007AFF" />
            <ThemedText style={styles.headerBadgeCount}>
              {riskPigs.length}
            </ThemedText>
          </ThemedView>
        </ThemedView>
        <ThemedText style={styles.subtitle}>
          Monitor pigs that need attention
        </ThemedText>
      </ThemedView>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {riskPigs.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <ThemedView style={styles.emptyStateIcon}>
              <IconSymbol name="checkmark.shield.fill" size={48} color="#30D158" />
            </ThemedView>
            <ThemedText style={styles.emptyStateText}>All Clear</ThemedText>
            <ThemedText style={styles.emptyStateSubtext}>
              No pigs require immediate attention
            </ThemedText>
          </ThemedView>
        ) : (
          <>
            <ThemedView style={styles.alertsHeader}>
              <ThemedText style={styles.alertsTitle}>
                Risk Alerts
              </ThemedText>
              <ThemedText style={styles.alertsSubtitle}>
                {riskPigs.length} {riskPigs.length === 1 ? 'pig needs' : 'pigs need'} attention
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.alertsList}>
              {riskPigs.map(pig => {
                const breed = breeds.find(b => b.id === pig.breed_id);
                if (!breed) return null;

                const pigRecords = records?.filter(r => r.pig_id === pig.id) || [];
                const pigChecklistRecords = checklistRecords?.filter(r => 
                  pigRecords.some(pr => pr.id === r.monitoring_id)
                ) || [];

                const riskAnalysis = calculateRiskLevel(pigRecords, pigChecklistRecords, breed, pig.category);
                const riskColor = getRiskColor(riskAnalysis.riskLevel);

                return (
                  <Link
                    key={pig.id}
                    href={{
                      pathname: "/(pigs)/[id]/monitor" as const,
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
                              <ThemedText style={styles.pigBreed}>{breed.name}</ThemedText>
                            </ThemedView>
                          </ThemedView>
                          <ThemedView style={[
                            styles.riskBadge,
                            { backgroundColor: `${riskColor}15` }
                          ]}>
                            <IconSymbol 
                              name={riskAnalysis.riskLevel === 'High' ? 
                                'exclamationmark.triangle.fill' : 
                                'exclamationmark.circle.fill'} 
                              size={16} 
                              color={riskColor} 
                            />
                            <ThemedText style={[styles.riskText, { color: riskColor }]}>
                              {riskAnalysis.riskLevel}
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
                            {riskAnalysis.riskLevel === 'High' 
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
                );
              })}
            </ThemedView>
          </>
        )}
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
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.6,
  },
  headerBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    textAlign: 'center',
    overflow: 'hidden',
    paddingHorizontal: 4,
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyStateIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(48, 209, 88, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateText: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 15,
    opacity: 0.6,
    textAlign: 'center',
  },
  alertsHeader: {
    marginBottom: 16,
  },
  alertsTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  alertsSubtitle: {
    fontSize: 15,
    opacity: 0.6,
  },
  alertsList: {
    gap: 12,
  },
  alertCardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  alertCard: {
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    padding: 16,
    gap: 16,
  },
  alertCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pigProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pigImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  pigImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(142, 142, 147, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pigImageInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
  },
  pigInfo: {
    gap: 4,
  },
  pigName: {
    fontSize: 17,
    fontWeight: '600',
  },
  pigBreed: {
    fontSize: 14,
    opacity: 0.6,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  riskText: {
    fontSize: 13,
    fontWeight: '600',
  },
  alertMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 142, 147, 0.06)',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  messageIcon: {
    opacity: 0.6,
  },
  messageText: {
    fontSize: 14,
    opacity: 0.8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(142, 142, 147, 0.1)',
  },
  actionButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
}); 