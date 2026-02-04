import React, { useState, useCallback } from 'react';
import { StyleSheet, Dimensions, Image, TextInput, ActivityIndicator, ScrollView, Pressable, View, TouchableOpacity, StatusBar } from 'react-native';
import { Link } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, withSpring, useSharedValue, useAnimatedStyle, withDelay } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Components
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
    <ThemedView lightColor="#FFFFFF" darkColor="#1E293B" style={styles.pigCardInner}>
      <View style={styles.pigCardHeader}>
        <View style={styles.pigAvatarContainer}>
          <ThemedText style={styles.pigAvatarText}>{pig.name.charAt(0).toUpperCase()}</ThemedText>
        </View>
        <View style={styles.pigHeaderInfo}>
          <View style={styles.pigNameRow}>
            <ThemedText style={styles.pigName} type="subtitle">{pig.name}</ThemedText>
            <View style={[styles.statusBadge, pig.category === 'Adult' ? styles.badgeAdult : styles.badgeYoung]}>
              <ThemedText style={[styles.statusText, pig.category === 'Adult' ? styles.textAdult : styles.textYoung]}>
                {pig.category}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={styles.pigBreed}>{pig.breed_name}</ThemedText>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Link href={{ pathname: "/(pigs)/[id]/edit", params: { id: pig.id } }} asChild>
          <TouchableOpacity style={styles.actionButton}>
            <IconSymbol name="pencil" size={16} color="#4F46E5" />
            <ThemedText style={styles.actionText}>Edit</ThemedText>
          </TouchableOpacity>
        </Link>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteAction]}
          onPress={onDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <>
              <IconSymbol name="trash" size={16} color="#EF4444" />
              <ThemedText style={[styles.actionText, styles.deleteText]}>Delete</ThemedText>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  const insets = useSafeAreaInsets();

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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#6366F1', '#4338CA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerAvatarContainer}>
              <Image source={require('@/assets/images/pig.png')} style={styles.headerAvatar} />
            </View>
            <ThemedText style={styles.headerTitle}>Pig Management</ThemedText>
            <ThemedText style={styles.headerSubtitle}>Monitor and track your pigs' health</ThemedText>

            <Link href="/(pigs)/new" asChild>
              <TouchableOpacity style={styles.headerAddButton}>
                <IconSymbol name="plus.circle.fill" size={20} color="#FFFFFF" />
                <ThemedText style={styles.headerAddButtonText}>Add New Pig</ThemedText>
              </TouchableOpacity>
            </Link>
          </View>
        </LinearGradient>

        <View style={styles.searchSectionOverlap}>
          <View style={styles.searchBar}>
            <IconSymbol name="magnifyingglass" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search pigs..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {(['All', 'Adult', 'Young'] as CategoryFilter[]).map((category, index) => (
              <AnimatedFilterButton
                key={category}
                type={category}
                isActive={categoryFilter === category}
                onPress={() => setCategoryFilter(category)}
                delay={index * 100}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.contentSection}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
          ) : error ? (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{error.message}</ThemedText>
            </View>
          ) : (
            <View style={styles.pigsList}>
              {filteredPigs.map(pig => (
                <PigCard
                  key={pig.id}
                  pig={pig}
                  onDelete={() => handleDeleteRequest(pig.id)}
                  isDeleting={deletingId === pig.id}
                />
              ))}

              <View style={styles.addMoreCard}>
                <View style={styles.addMoreIconBg}>
                  <IconSymbol name="pawprint.fill" size={24} color="#CBD5E1" />
                </View>
                <ThemedText style={styles.addMoreText}>Ready to add more?</ThemedText>
              </View>
            </View>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Pig"
          message="Are you sure you want to delete this pig? This action cannot be undone."
          icon="trash"
          iconColor="#FF453A"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 80,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  headerAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    padding: 4,
    marginBottom: 8,
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  headerAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerAddButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  searchSectionOverlap: {
    marginTop: -50,
    paddingHorizontal: 20,
    gap: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 10,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  filterRow: {
    gap: 10,
    paddingVertical: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  contentSection: {
    padding: 20,
  },
  pigsList: {
    gap: 16,
  },
  pigCard: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pigCardInner: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  pigCardHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  pigAvatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pigAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366F1',
  },
  pigHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  pigNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pigName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeAdult: {
    backgroundColor: '#EFF6FF', // Blue 50
  },
  badgeYoung: {
    backgroundColor: '#FFF7ED', // Orange 50
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textAdult: {
    color: '#3B82F6',
  },
  textYoung: {
    color: '#F97316',
  },
  pigBreed: {
    fontSize: 14,
    color: '#64748B',
  },
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  deleteAction: {
    borderLeftWidth: 1,
    borderLeftColor: '#F1F5F9',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  deleteText: {
    color: '#EF4444',
  },
  addMoreCard: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  addMoreIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  addMoreText: {
    fontSize: 15,
    color: '#94A3B8',
    fontWeight: '500',
  },
  addMoreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
  },
}); 