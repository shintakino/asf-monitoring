import React from 'react';
import { useState, useCallback } from 'react';
import { StyleSheet, Dimensions, Image, TextInput, ActivityIndicator, ScrollView, Pressable, View } from 'react-native';
import { Link } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, withSpring, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

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

const AnimatedFilterButton: React.FC<{
  type: CategoryFilter;
  isActive: boolean;
  onPress: () => void;
  delay?: number;
}> = ({ type, isActive, onPress, delay = 0 }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  React.useEffect(() => {
    opacity.value = withSpring(1);
  }, []);

  const onPressIn = () => {
    scale.value = withSpring(0.95);
  };

  const onPressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View style={animatedStyle}>
      <ThemedView
        onTouchStart={onPressIn}
        onTouchEnd={() => {
          onPressOut();
          onPress();
        }}
        style={[
          styles.filterButton,
          isActive && styles.filterButtonActive,
        ]}
      >
        <IconSymbol
          name={type === 'All' ? 'list.bullet' : type === 'Adult' ? 'person.2.fill' : 'person.fill'}
          size={16}
          color={isActive ? '#007AFF' : '#8E8E93'}
        />
        <ThemedText style={[
          styles.filterButtonText,
          isActive && styles.filterButtonTextActive
        ]}>
          {type}
        </ThemedText>
      </ThemedView>
    </Animated.View>
  );
};

const PigCard: React.FC<{
  pig: Pig;
  onDelete: () => void;
  isDeleting: boolean;
}> = ({ pig, onDelete, isDeleting }) => (
  <Animated.View
    entering={FadeInUp.delay(100).duration(600).springify()}
    style={styles.pigCard}
  >
    <ThemedView style={styles.pigCardContent}>
      <ThemedView style={styles.pigImageWrapper}>
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
      </ThemedView>

      <ThemedView style={styles.pigInfo}>
        <ThemedView style={styles.pigNameRow}>
          <ThemedText style={styles.pigName}>{pig.name}</ThemedText>
          <ThemedView style={[
            styles.categoryBadge,
            pig.category === 'Adult' ? styles.adultBadge : styles.youngBadge
          ]}>
            <ThemedText style={[
              styles.categoryText,
              pig.category === 'Adult' ? styles.adultText : styles.youngText
            ]}>
              {pig.category}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.pigMetaInfo}>
          <ThemedText style={styles.breedName}>{pig.breed_name}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.pigActions}>
          <Link
            href={{
              pathname: "/(pigs)/[id]/edit",
              params: { id: pig.id }
            }}
            style={styles.actionButton}
          >
            <IconSymbol name="pencil" size={16} color="#007AFF" />
            <ThemedText style={styles.actionButtonText}>Edit</ThemedText>
          </Link>
          <ThemedView
            style={[styles.actionButton, styles.deleteButton]}
            onTouchEnd={onDelete}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#FF453A" />
            ) : (
              <>
                <IconSymbol name="trash" size={16} color="#FF453A" />
                <ThemedText style={[styles.actionButtonText, styles.deleteButtonText]}>
                  Delete
                </ThemedText>
              </>
            )}
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  </Animated.View>
);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PigsScreen() {
  const { pigs, isLoading, error, searchPigs, refreshPigs, deletePig } = usePigs();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshPigs();
    }, [refreshPigs])
  );

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

  return (
    <>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#6366F1', dark: '#1E293B' }}
        headerImage={
          <View style={styles.headerContent}>
            <Image
              source={require('@/assets/images/pig.png')}
              style={styles.headerIcon}
            />
            <View style={styles.headerTextContainer}>
              <ThemedText style={styles.headerTitle}>Pig Management</ThemedText>
              <ThemedText style={styles.headerSubtitle}>
                Monitor and track your pigs' health
              </ThemedText>
            </View>
            <Link href="/(pigs)/new" style={styles.addButton}>
              <IconSymbol name="plus.circle.fill" size={20} color="#FFFFFF" />
              <ThemedText style={styles.addButtonText}>Add New Pig</ThemedText>
            </Link>
          </View>
        }
      >
        <ThemedView style={styles.container}>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <ThemedView style={styles.filterButtons}>
                {(['All', 'Adult', 'Young'] as CategoryFilter[]).map((category, index) => (
                  <AnimatedFilterButton
                    key={category}
                    type={category}
                    isActive={categoryFilter === category}
                    onPress={() => setCategoryFilter(category)}
                    delay={index * 100}
                  />
                ))}
              </ThemedView>
            </ScrollView>
          </ThemedView>

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
              {filteredPigs.map(pig => (
                <PigCard
                  key={pig.id}
                  pig={pig}
                  onDelete={() => handleDeleteRequest(pig.id)}
                  isDeleting={deletingId === pig.id}
                />
              ))}
            </ScrollView>
          )}
        </ThemedView>
      </ParallaxScrollView>

      <Link href="/(pigs)/new" asChild>
        <AnimatedPressable
          entering={FadeInUp.delay(500).springify()}
          style={styles.floatingButton}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.2)', borderless: true }}
        >
          <ThemedView style={styles.fabContainer}>
            <MaterialIcons name="add" size={24} color="#FFFFFF" />
          </ThemedView>
        </AnimatedPressable>
      </Link>

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
    </>
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
  searchContainer: {
    gap: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.1)',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#6366F1', // Indigo 500
  },
  filterButtonText: {
    fontSize: 14,
    color: '#64748B', // Slate 500
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pigCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  pigCardContent: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  pigImageWrapper: {
    position: 'relative',
  },
  pigImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
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
    fontSize: 24,
    fontWeight: '700',
    color: '#64748B', // Slate 500
  },
  pigInfo: {
    flex: 1,
    gap: 8,
  },
  pigNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pigName: {
    fontSize: 18,
    fontWeight: '700',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  adultBadge: {
    backgroundColor: '#F0F9FF', // Sky 50
    borderColor: 'transparent',
  },
  youngBadge: {
    backgroundColor: '#FFFBEB', // Amber 50
    borderColor: 'transparent',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  adultText: {
    color: '#0EA5E9', // Sky 500
  },
  youngText: {
    color: '#D97706', // Amber 600
  },
  pigMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breedName: {
    fontSize: 14,
    color: '#64748B', // Slate 500
  },
  pigActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9', // Slate 100
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569', // Slate 600
  },
  deleteButton: {
    backgroundColor: '#FEF2F2', // Red 50
  },
  deleteButtonText: {
    color: '#EF4444', // Red 500
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
    padding: 32,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
    borderRadius: 24,
    marginTop: 32,
    minHeight: 300,
    borderWidth: 2,
    borderColor: 'rgba(150, 150, 150, 0.1)',
    borderStyle: 'dashed',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    color: '#64748B',
  },
  emptyStateText: {
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 24,
    lineHeight: 22,
    color: '#64748B',
  },
  emptyStateButton: {
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
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pigsList: {
    flex: 1,
  },
  pigsListContent: {
    gap: 16,
    paddingBottom: 100,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 1000,
  },
  fabContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1', // Indigo 500
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 6,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  addButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
}); 