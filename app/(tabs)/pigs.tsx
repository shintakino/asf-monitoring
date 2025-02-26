import React from 'react';
import { useState, useCallback } from 'react';
import { StyleSheet, Dimensions, Image, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

// Components
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ConfirmDialog } from '@/components/ConfirmDialog';

// Hooks & Types
import { usePigs } from '@/hooks/usePigs';
import type { Pig } from '@/utils/database';

type CategoryFilter = 'All' | 'Adult' | 'Young';

export default function PigsScreen() {
  // Hooks
  const { pigs, isLoading, error, searchPigs, refreshPigs, deletePig } = usePigs();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Auto-refresh on focus
  useFocusEffect(
    useCallback(() => {
      refreshPigs();
    }, [refreshPigs])
  );

  // Handlers
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchPigs(query);
  };

  const filteredPigs = pigs.filter(pig => 
    categoryFilter === 'All' || pig.category === categoryFilter
  );

  const handleDeleteRequest = (id: number) => {
    setDeleteConfirm(id);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm) {
      try {
        setDeletingId(deleteConfirm);
        await deletePig(deleteConfirm);
      } catch (e) {
        console.error('Failed to delete pig:', e);
      } finally {
        setDeletingId(null);
        setDeleteConfirm(null);
      }
    }
  };

  // Render helper functions
  const renderHeader = () => (
        <ThemedView style={styles.headerContent}>
          <Image 
            source={require('@/assets/images/pig.png')}
            style={styles.headerIcon}
          />
          <ThemedView style={styles.headerTextContainer}>
            <ThemedText style={styles.headerTitle}>Pig Management</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Monitor and track your pigs' health
            </ThemedText>
          </ThemedView>
          <Link href="/(pigs)/new" style={styles.addButton}>
            <IconSymbol name="plus.circle.fill" size={20} color="#007AFF" />
            <ThemedText style={styles.addButtonText}>Add New Pig</ThemedText>
          </Link>
        </ThemedView>
  );

  const renderSearchAndFilter = () => (
        <ThemedView style={styles.searchContainer}>
          <ThemedView style={styles.searchBar}>
            <IconSymbol name="magnifyingglass" size={20} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search pigs..."
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </ThemedView>
          <ThemedView style={styles.filterChips}>
            {(['All', 'Adult', 'Young'] as CategoryFilter[]).map((category) => (
              <ThemedView
                key={category}
                style={[
                  styles.chip,
                  categoryFilter === category && styles.chipActive
                ]}
                onTouchEnd={() => setCategoryFilter(category)}
              >
                <ThemedText style={[
                  styles.chipText,
                  categoryFilter === category && styles.chipTextActive
                ]}>{category}</ThemedText>
              </ThemedView>
            ))}
          </ThemedView>
        </ThemedView>
  );

  const renderPigCard = (pig: Pig) => (
              <ThemedView key={pig.id} style={styles.pigCard} darkColor="#1C1C1E" lightColor="#FFFFFF">
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
                  <ThemedView style={styles.pigInfo}>
        <ThemedText style={styles.pigName}>{pig.name}</ThemedText>
                    <ThemedView style={styles.pigMetaInfo}>
                      <ThemedText style={styles.pigDetails} darkColor="#8E8E93" lightColor="#8E8E93">
                        {pig.breed_name}
                      </ThemedText>
          <ThemedText style={styles.pigDot} darkColor="#8E8E93" lightColor="#8E8E93">•</ThemedText>
                      <ThemedView style={[
                        styles.categoryBadge,
                        pig.category === 'Adult' ? styles.adultBadge : styles.youngBadge
                      ]}>
            <ThemedText style={styles.categoryText}>{pig.category}</ThemedText>
          </ThemedView>
                      </ThemedView>
                      <ThemedView style={styles.pigActions}>
                  <Link 
                    href={{
                      pathname: "/(pigs)/[id]/edit",
                      params: { id: pig.id }
                    }} 
                    style={styles.actionButton}
                  >
                    <MaterialIcons name="edit" size={20} color="#007AFF" />
                  </Link>
                  <ThemedView 
                    style={styles.actionButton}
                    darkColor="rgba(142, 142, 147, 0.18)"
                    lightColor="rgba(142, 142, 147, 0.12)"
                    onTouchEnd={() => handleDeleteRequest(pig.id)}
                  >
                    {deletingId === pig.id ? (
                      <ActivityIndicator size="small" color="#FF453A" />
                    ) : (
                      <MaterialIcons name="delete" size={20} color="#FF453A" />
                    )}
                  </ThemedView>
                </ThemedView>
                    </ThemedView>
    </ThemedView>
  );

  // Main render
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={renderHeader()}
    >
      <ThemedView style={styles.container}>
        {renderSearchAndFilter()}

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
            <IconSymbol name="square.stack.3d.up.fill" size={64} color="#007AFF" />
            <ThemedText style={styles.emptyStateTitle}>No Pigs Yet</ThemedText>
            <ThemedText style={styles.emptyStateText}>
              Start by adding your first pig to monitor their health
            </ThemedText>
            <Link href="/(pigs)/new" style={styles.emptyStateButton}>
              <ThemedText style={styles.emptyStateButtonText}>Add Your First Pig</ThemedText>
            </Link>
              </ThemedView>
        ) : (
          <ScrollView style={styles.pigsList} contentContainerStyle={styles.pigsListContent}>
            {filteredPigs.map(renderPigCard)}
          </ScrollView>
        )}
      </ThemedView>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Pig"
          message="Are you sure you want to delete this pig? This action cannot be undone."
          icon="trash.fill"
          iconColor="#FF453A"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </ParallaxScrollView>
  );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 20,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginTop: 0,
  },
  addButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  searchContainer: {
    gap: 12,
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
    color: '#000000',
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.1)',
  },
  chipActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderColor: '#007AFF',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#007AFF',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#FF453A',
    textAlign: 'center',
  },
  pigsList: {
    flex: 1,
  },
  pigsListContent: {
    padding: 16,
    gap: 12,
  },
  pigCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pigCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
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
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pigImageInitial: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
  },
  pigInfo: {
    flex: 1,
    gap: 4,
    
  },
  pigName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pigDetails: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  pigActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 100,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pigMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pigDot: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  adultBadge: {
    backgroundColor: 'rgba(48, 209, 88, 0.2)',
  },
  youngBadge: {
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
  },
  adultText: {
    color: '#30D158',
  },
  youngText: {
    color: '#FF9500',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
}); 