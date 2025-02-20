import { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Link, Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useChecklist } from '@/hooks/useChecklist';
import { useFocusEffect } from '@react-navigation/native';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MaterialIcons } from '@expo/vector-icons';
import type { Checklist } from '@/utils/database';

export default function ChecklistScreen() {
  const { items, isLoading, error, searchItems, deleteItem, refreshItems } = useChecklist();
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Refresh checklist when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshItems();
    }, [refreshItems])
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchItems(query);
  };

  const handleDeleteRequest = (id: number) => {
    setDeleteConfirm(id);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm) {
      try {
        setDeletingId(deleteConfirm);
        await deleteItem(deleteConfirm);
      } catch (e) {
        console.error('Failed to delete checklist item:', e);
      } finally {
        setDeletingId(null);
      }
    }
    setDeleteConfirm(null);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Health Checklist',
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
            <ThemedText style={styles.headerTitle}>Health Checklist</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Manage symptoms and risk levels
            </ThemedText>
          </ThemedView>
          <Link href="/(settings)/checklist/new" style={styles.addButton}>
            <IconSymbol name="plus.circle.fill" size={20} color="#007AFF" />
            <ThemedText style={styles.addButtonText}>Add Item</ThemedText>
          </Link>
        </ThemedView>

        {/* Search Bar */}
        <ThemedView style={styles.searchBar}>
          <IconSymbol name="magnifyingglass" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search symptoms..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </ThemedView>

        {/* Content area */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : error ? (
          <ThemedView style={styles.errorContainer}>
            <IconSymbol name="exclamationmark.triangle.fill" size={32} color="#FF453A" />
            <ThemedText style={styles.errorText}>Failed to load checklist items</ThemedText>
          </ThemedView>
        ) : items.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <IconSymbol name="checklist" size={64} color="#007AFF" />
            <ThemedText style={styles.emptyStateTitle}>No Checklist Items</ThemedText>
            <ThemedText style={styles.emptyStateText}>
              Add your first health checklist item to start monitoring
            </ThemedText>
            <Link href="/(settings)/checklist/new" style={styles.emptyStateButton}>
              <ThemedText style={styles.emptyStateButtonText}>Add First Item</ThemedText>
            </Link>
          </ThemedView>
        ) : (
          <ScrollView style={styles.checklistItems}>
            {items.map((item) => (
              <ThemedView key={item.id} style={styles.item}>
                <ThemedView style={styles.itemContent}>
                  <ThemedView style={styles.itemHeader}>
                    <ThemedText style={styles.symptom}>{item.symptom}</ThemedText>
                    <ThemedView style={[styles.riskBadge, getRiskStyle(item.risk_weight)]}>
                      <ThemedText style={styles.riskWeight}>Risk Level: {item.risk_weight}</ThemedText>
                    </ThemedView>
                  </ThemedView>
                  <ThemedText style={styles.recommendation}>
                    {item.treatment_recommendation}
                  </ThemedText>
                </ThemedView>
                <ThemedView style={styles.itemActions}>
                  <Link 
                    href={{
                      pathname: "/(settings)/checklist/[id]/edit",
                      params: { id: item.id }
                    }} 
                    style={styles.actionButton}>
                    <MaterialIcons name="edit" size={20} color="#007AFF" />
                  </Link>
                  <ThemedView 
                    style={styles.actionButton}
                    onTouchEnd={() => handleDeleteRequest(item.id)}
                  >
                    {deletingId === item.id ? (
                      <ActivityIndicator size="small" color="#FF453A" />
                    ) : (
                      <MaterialIcons name="delete" size={20} color="#FF453A" />
                    )}
                  </ThemedView>
                </ThemedView>
              </ThemedView>
            ))}
          </ScrollView>
        )}

        {/* Footer Section */}
        <ThemedView style={styles.footer}>
          <ThemedText style={styles.footerText}>
            Health checklist items are used during daily monitoring to assess pig health and calculate risk levels.
          </ThemedText>
          <ThemedView style={styles.footerDivider} />
          <ThemedView style={styles.riskLegend}>
            <ThemedText style={styles.riskLegendTitle}>Risk Level Guide:</ThemedText>
            <ThemedView style={styles.riskLevels}>
              <ThemedView style={styles.riskLevel}>
                <ThemedView style={[styles.riskDot, { backgroundColor: 'rgba(255, 69, 58, 0.2)' }]} />
                <ThemedText style={styles.riskLevelText}>5 - High Risk</ThemedText>
              </ThemedView>
              <ThemedView style={styles.riskLevel}>
                <ThemedView style={[styles.riskDot, { backgroundColor: 'rgba(255, 149, 0, 0.2)' }]} />
                <ThemedText style={styles.riskLevelText}>4 - Medium-High</ThemedText>
              </ThemedView>
              <ThemedView style={styles.riskLevel}>
                <ThemedView style={[styles.riskDot, { backgroundColor: 'rgba(255, 214, 10, 0.2)' }]} />
                <ThemedText style={styles.riskLevelText}>3 - Medium</ThemedText>
              </ThemedView>
              <ThemedView style={styles.riskLevel}>
                <ThemedView style={[styles.riskDot, { backgroundColor: 'rgba(48, 209, 88, 0.2)' }]} />
                <ThemedText style={styles.riskLevelText}>2 - Medium-Low</ThemedText>
              </ThemedView>
              <ThemedView style={styles.riskLevel}>
                <ThemedView style={[styles.riskDot, { backgroundColor: 'rgba(142, 142, 147, 0.2)' }]} />
                <ThemedText style={styles.riskLevelText}>1 - Low Risk</ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </ThemedView>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Checklist Item"
          message="Are you sure you want to delete this checklist item? This action cannot be undone."
          icon="trash.fill"
          iconColor="#FF453A"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </>
  );
}

// Helper function for risk level styling
function getRiskStyle(risk: number) {
  switch (risk) {
    case 5: return { backgroundColor: 'rgba(255, 69, 58, 0.1)' }; // High
    case 4: return { backgroundColor: 'rgba(255, 149, 0, 0.1)' }; // Medium-High
    case 3: return { backgroundColor: 'rgba(255, 214, 10, 0.1)' }; // Medium
    case 2: return { backgroundColor: 'rgba(48, 209, 88, 0.1)' }; // Medium-Low
    default: return { backgroundColor: 'rgba(142, 142, 147, 0.1)' }; // Low
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginTop: 20,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF453A',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    borderRadius: 20,
    marginTop: 20,
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
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  checklistItems: {
    flex: 1,
  },
  item: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  itemContent: {
    gap: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  symptom: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskWeight: {
    fontSize: 12,
    fontWeight: '600',
  },
  recommendation: {
    fontSize: 14,
    opacity: 0.7,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 12,
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
  riskLegend: {
    gap: 12,
  },
  riskLegendTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  riskLevels: {
    gap: 8,
  },
  riskLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  riskDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  riskLevelText: {
    fontSize: 13,
    opacity: 0.8,
  },
});