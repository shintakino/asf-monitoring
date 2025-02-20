import { StyleSheet, Dimensions, Image } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function DashboardScreen() {
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
          <IconSymbol name="pig" size={32} color="#FF9500" />
          <ThemedText style={styles.statNumber} type="title">0</ThemedText>
          <ThemedText style={styles.statLabel}>Total Pigs</ThemedText>
        </ThemedView>
        <ThemedView style={styles.statCard}>
          <IconSymbol name="checkmark.circle.fill" size={32} color="#30D158" />
          <ThemedText style={styles.statNumber} type="title">0</ThemedText>
          <ThemedText style={styles.statLabel}>Monitored</ThemedText>
        </ThemedView>
        <ThemedView style={styles.statCard}>
          <IconSymbol name="exclamationmark.circle.fill" size={32} color="#FF453A" />
          <ThemedText style={styles.statNumber} type="title">0</ThemedText>
          <ThemedText style={styles.statLabel}>Not Monitored</ThemedText>
        </ThemedView>
      </ThemedView>

      {/* Filter Section */}
      <ThemedView style={styles.filterContainer}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Filter Status</ThemedText>
        <ThemedView style={styles.filterButtons}>
          <ThemedView style={[styles.filterButton, styles.filterButtonActive]}>
            <IconSymbol name="list.bullet" size={20} color="#007AFF" />
            <ThemedText style={styles.filterButtonText}>All</ThemedText>
          </ThemedView>
          <ThemedView style={styles.filterButton}>
            <IconSymbol name="checkmark.circle" size={20} color="#30D158" />
            <ThemedText style={styles.filterButtonText}>Monitored</ThemedText>
          </ThemedView>
          <ThemedView style={styles.filterButton}>
            <IconSymbol name="exclamationmark.circle" size={20} color="#FF453A" />
            <ThemedText style={styles.filterButtonText}>Not Monitored</ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>

      {/* Pig List Section */}
      <ThemedView style={styles.pigListContainer}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Pig Profiles</ThemedText>
        <ThemedView style={styles.emptyState}>
          <IconSymbol name="plus.circle.fill" size={48} color="#007AFF" />
          <ThemedText style={styles.emptyStateText}>No pigs added yet</ThemedText>
          <ThemedText style={styles.emptyStateSubtext}>
            Add your first pig to start monitoring
          </ThemedText>
        </ThemedView>
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
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
});
