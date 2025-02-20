import { StyleSheet, Dimensions, Image } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function ReportsScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <ThemedView style={styles.headerContent}>
          <Image 
            source={require('@/assets/images/pig.png')}
            style={styles.headerIcon}
          />
          <ThemedView style={styles.headerTextContainer}>
            <ThemedText style={styles.headerTitle}>Health Reports</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Track and analyze pig health data
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.headerBadge}>
            <IconSymbol name="chart.bar.fill" size={16} color="#30D158" />
            <ThemedText style={styles.headerBadgeText}>Analytics</ThemedText>
          </ThemedView>
        </ThemedView>
      }>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.emptyState}>
          <IconSymbol name="chart.line.uptrend.xyaxis" size={64} color="#30D158" />
          <ThemedText style={styles.emptyStateTitle}>No Data Available</ThemedText>
          <ThemedText style={styles.emptyStateText}>
            Start monitoring your pigs to see health reports and trends
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
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginTop: 2,
  },
  headerBadgeText: {
    fontSize: 13,
    color: '#30D158',
    fontWeight: '600',
  },
  container: {
    padding: 16,
    gap: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    borderRadius: 20,
    marginTop: 32,
    minHeight: 400,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
}); 