import React from 'react';
import { useState, useCallback } from 'react';
import { StyleSheet, Dimensions, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { Link, Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useBreeds } from '@/hooks/useBreeds';
import { useFocusEffect } from '@react-navigation/native';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MaterialIcons } from '@expo/vector-icons';

export default function BreedManagementScreen() {
  const { breeds, isLoading, error, searchBreeds, deleteBreed, refreshBreeds } = useBreeds();
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Refresh breeds list when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshBreeds();
    }, [refreshBreeds])
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchBreeds(query);
  };

  const handleDeleteRequest = (id: number) => {
    setDeleteConfirm(id);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm) {
      try {
        setDeletingId(deleteConfirm);
        await deleteBreed(deleteConfirm);
      } catch (e) {
        console.error('Failed to delete breed:', e);
      } finally {
        setDeletingId(null);
      }
    }
    setDeleteConfirm(null);
  };

  const formatTemp = (min: number, max: number) => `${min.toFixed(1)}°C - ${max.toFixed(1)}°C`;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Breed Management',
          headerStyle: {
            backgroundColor: '#D0D0D0',
          },
          headerTintColor: '#000',
          headerShadowVisible: false,
        }}
      />
      
      <ThemedView style={styles.container}>
        {/* Header Section */}
        <ThemedView style={styles.header}>
          <ThemedView style={styles.headerLeft}>
            <ThemedText style={styles.headerTitle}>Pig Breeds</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Manage breed temperature ranges
            </ThemedText>
          </ThemedView>
          <Link href="/(settings)/breeds/new" style={styles.addButton}>
            <IconSymbol name="plus.circle.fill" size={20} color="#007AFF" />
            <ThemedText style={styles.addButtonText}>Add Breed</ThemedText>
          </Link>
        </ThemedView>

        {/* Search Bar */}
        <ThemedView style={styles.searchBar}>
          <IconSymbol name="magnifyingglass" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search breeds..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </ThemedView>

        {/* Content area - scrollable */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : error ? (
          <ThemedView style={styles.errorContainer}>
            <IconSymbol name="exclamationmark.triangle.fill" size={32} color="#FF453A" />
            <ThemedText style={styles.errorText}>{error.message}</ThemedText>
          </ThemedView>
        ) : breeds.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <IconSymbol name="pawprint.circle.fill" size={64} color="#FF9500" />
            <ThemedText style={styles.emptyStateTitle}>No Breeds Added</ThemedText>
            <ThemedText style={styles.emptyStateText}>
              Add your first pig breed to set temperature ranges for monitoring
            </ThemedText>
            <Link href="/(settings)/breeds/new" style={styles.emptyStateButton}>
              <ThemedText style={styles.emptyStateButtonText}>Add First Breed</ThemedText>
            </Link>
          </ThemedView>
        ) : (
          <ScrollView 
            style={styles.breedList}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {breeds.map((breed) => (
              <ThemedView key={breed.id} style={styles.breedItem}>
                <ThemedView style={styles.breedItemContent}>
                  <ThemedView style={styles.breedInfo}>
                    <ThemedText style={styles.breedName}>{breed.name}</ThemedText>
                    <ThemedView style={styles.tempRanges}>
                      <ThemedView style={styles.tempRange}>
                        <ThemedText style={styles.tempLabel}>Adult:</ThemedText>
                        <ThemedText style={styles.tempValue}>
                          {formatTemp(breed.min_temp_adult, breed.max_temp_adult)}
                        </ThemedText>
                      </ThemedView>
                      <ThemedView style={styles.tempRange}>
                        <ThemedText style={styles.tempLabel}>Young:</ThemedText>
                        <ThemedText style={styles.tempValue}>
                          {formatTemp(breed.min_temp_young, breed.max_temp_young)}
                        </ThemedText>
                      </ThemedView>
                    </ThemedView>
                  </ThemedView>
                  <ThemedView style={styles.breedActions}>
                    <Link 
                    href={{
                      pathname: "/(settings)/breeds/[id]/edit",
                      params: { id: breed.id }
                    }}  
                    style={styles.actionButton}>
                      <MaterialIcons name="edit" size={20} color="#007AFF" />
                    </Link>
                    <ThemedView 
                      style={styles.actionButton}
                      onTouchEnd={() => handleDeleteRequest(breed.id)}
                    >
                      {deletingId === breed.id ? (
                        <ActivityIndicator size="small" color="#FF453A" />
                      ) : (
                        <MaterialIcons name="delete" size={20} color="#FF453A" />
                      )}
                    </ThemedView>
                  </ThemedView>
                </ThemedView>
              </ThemedView>
            ))}
          </ScrollView>
        )}

        {/* Add confirmation dialog */}
        {deleteConfirm && (
          <ConfirmDialog
            title="Delete Breed"
            message="Are you sure you want to delete this breed? This action cannot be undone."
            icon="trash.fill"
            iconColor="#FF453A"
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteConfirm(null)}
          />
        )}

        {/* Footer Section */}
        <ThemedView style={styles.footer}>
          <ThemedText style={styles.footerText}>
            Breed temperature ranges are used to determine normal temperature thresholds during daily health monitoring.
          </ThemedText>
          <ThemedView style={styles.footerDivider} />
          <ThemedView style={styles.tempGuide}>
            <ThemedText style={styles.tempGuideTitle}>Temperature Guide:</ThemedText>
            <ThemedView style={styles.tempRanges}>
              <ThemedView style={styles.tempGuideItem}>
                <ThemedView style={[styles.tempDot, { backgroundColor: 'rgba(48, 209, 88, 0.2)' }]} />
                <ThemedText style={styles.tempGuideText}>Normal Range</ThemedText>
              </ThemedView>
              <ThemedView style={styles.tempGuideItem}>
                <ThemedView style={[styles.tempDot, { backgroundColor: 'rgba(255, 149, 0, 0.2)' }]} />
                <ThemedText style={styles.tempGuideText}>Slightly Abnormal</ThemedText>
              </ThemedView>
              <ThemedView style={styles.tempGuideItem}>
                <ThemedView style={[styles.tempDot, { backgroundColor: 'rgba(255, 69, 58, 0.2)' }]} />
                <ThemedText style={styles.tempGuideText}>Critical Range</ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#FF453A',
    textAlign: 'center',
  },
  breedList: {
    flex: 1,
  },
  breedItem: {
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    borderRadius: 12,
    marginBottom: 8,
  },
  breedItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  breedInfo: {
    flex: 1,
    gap: 8,
  },
  tempRanges: {
    gap: 8,
  },
  tempRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tempLabel: {
    fontSize: 14,
    opacity: 0.7,
    width: 50,
  },
  tempValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  breedName: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    borderRadius: 20,
    marginVertical: 16,
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
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  breedActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 24,
    gap: 16,
    opacity: 0.8,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
  },
  footerDivider: {
    height: 1,
    backgroundColor: 'rgba(142, 142, 147, 0.2)',
    marginVertical: 8,
  },
  tempGuide: {
    gap: 12,
  },
  tempGuideTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  tempGuideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  tempDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tempGuideText: {
    fontSize: 13,
    opacity: 0.8,
  },
}); 