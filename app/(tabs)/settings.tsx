import React from 'react';
import { StyleSheet, Dimensions, Image, View } from 'react-native';
import { Link } from 'expo-router';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function SettingsScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#6366F1', dark: '#1E293B' }}
      headerImage={
        <View style={styles.headerContent}>
          <Image
            source={require('@/assets/images/pig.png')}
            style={styles.headerIcon}
          />
          <View style={styles.headerTextContainer}>
            <ThemedText style={styles.headerTitle}>Settings</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Configure your monitoring preferences
            </ThemedText>
          </View>
          <View style={styles.headerBadge}>
            <IconSymbol name="gearshape.fill" size={16} color="#FFFFFF" />
            <ThemedText style={styles.headerBadgeText}>Configuration</ThemedText>
          </View>
        </View>
      }>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>Settings</ThemedText>

        {/* Checklist Management Section */}
        <ThemedView style={styles.section}>
          <ThemedView style={styles.sectionHeader}>
            <IconSymbol name="checklist" size={24} color="#30D158" />
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Checklist Management
            </ThemedText>
          </ThemedView>
          <Link href="/(settings)/checklist" style={styles.menuItem}>
            <ThemedView style={styles.menuItemContent}>
              <ThemedText style={styles.menuItemText}>
                Manage Health Checklist Items
              </ThemedText>
              <IconSymbol name="chevron.right" size={20} color="#8E8E93" />
            </ThemedView>
          </Link>
        </ThemedView>

        {/* Breed Management Section */}
        <ThemedView style={styles.section}>
          <ThemedView style={styles.sectionHeader}>
            <IconSymbol name="pawprint" size={24} color="#FF9500" />
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Breed Management
            </ThemedText>
          </ThemedView>
          <Link href="/(settings)/breeds" style={styles.menuItem}>
            <ThemedView style={styles.menuItemContent}>
              <ThemedText style={styles.menuItemText}>
                Manage Pig Breeds
              </ThemedText>
              <IconSymbol name="chevron.right" size={20} color="#8E8E93" />
            </ThemedView>
          </Link>
        </ThemedView>

        {/* Monitoring Time Settings Section */}
        <ThemedView style={styles.section}>
          <ThemedView style={styles.sectionHeader}>
            <IconSymbol name="clock" size={24} color="#007AFF" />
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Monitoring Schedule
            </ThemedText>
          </ThemedView>
          <Link href="/(settings)/monitoring-time" style={styles.menuItem}>
            <ThemedView style={styles.menuItemContent}>
              <ThemedText style={styles.menuItemText}>
                Set Daily Monitoring Time
              </ThemedText>
              <IconSymbol name="chevron.right" size={20} color="#8E8E93" />
            </ThemedView>
          </Link>
        </ThemedView>

        {/* App Info Section */}
        <ThemedView style={[styles.section, styles.infoSection]}>
          <ThemedText style={styles.version}>Version 1.0.0</ThemedText>
          <ThemedText style={styles.copyright}>
            © 2024 ASF Monitoring System
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
  container: {
    flex: 1,
    padding: 16,
    gap: 24,
  },
  title: {
    marginBottom: 8,
  },
  section: {
    gap: 12,
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  menuItem: {
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuItemText: {
    fontSize: 16,
  },
  infoSection: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    opacity: 0.6,
  },
  version: {
    fontSize: 14,
  },
  copyright: {
    fontSize: 12,
  },
}); 