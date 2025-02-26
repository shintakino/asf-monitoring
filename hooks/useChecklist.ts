import React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { Checklist } from '@/utils/database';
import { useFocusEffect } from '@react-navigation/native';

export function useChecklist() {
  const db = useSQLiteContext();
  const [items, setItems] = useState<Checklist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all checklist items
  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const results = await db.getAllAsync<Checklist>(`
        SELECT * FROM Checklist 
        ORDER BY risk_weight DESC, symptom ASC
      `);
      setItems(results);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch checklist items'));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  // Refresh items when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [fetchItems])
  );

  // Add new checklist item
  const addItem = useCallback(async (item: Omit<Checklist, 'id'>) => {
    try {
      console.log('Adding checklist item:', item);
      const result = await db.runAsync(
        `INSERT INTO Checklist (
          symptom, 
          risk_weight, 
          treatment_recommendation
        ) VALUES (?, ?, ?)`,
        [
          item.symptom,
          item.risk_weight,
          item.treatment_recommendation,
        ]
      );
      
      console.log('Checklist item added successfully:', result);
      await fetchItems();
      return result.lastInsertRowId;
    } catch (e) {
      console.error('Error adding checklist item:', e);
      throw e instanceof Error ? e : new Error('Failed to add checklist item');
    }
  }, [db, fetchItems]);

  // Update checklist item
  const updateItem = useCallback(async (item: Checklist) => {
    try {
      console.log('Updating checklist item:', item);
      await db.runAsync(
        `UPDATE Checklist 
         SET symptom = ?, 
             risk_weight = ?,
             treatment_recommendation = ?
         WHERE id = ?`,
        [
          item.symptom,
          item.risk_weight,
          item.treatment_recommendation,
          item.id,
        ]
      );
      
      console.log('Checklist item updated successfully');
      await fetchItems();
    } catch (e) {
      console.error('Error updating checklist item:', e);
      throw e instanceof Error ? e : new Error('Failed to update checklist item');
    }
  }, [db, fetchItems]);

  // Delete checklist item
  const deleteItem = useCallback(async (id: number) => {
    try {
      await db.runAsync('DELETE FROM Checklist WHERE id = ?', [id]);
      await fetchItems();
    } catch (e) {
      throw e instanceof Error ? e : new Error('Failed to delete checklist item');
    }
  }, [db, fetchItems]);

  // Search checklist items
  const searchItems = useCallback(async (query: string) => {
    try {
      setIsLoading(true);
      const results = await db.getAllAsync<Checklist>(
        `SELECT * FROM Checklist 
         WHERE symptom LIKE ? OR treatment_recommendation LIKE ?
         ORDER BY risk_weight DESC, symptom ASC`,
        [`%${query}%`, `%${query}%`]
      );
      setItems(results);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to search checklist items'));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  // Initial load
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    isLoading,
    error,
    addItem,
    updateItem,
    deleteItem,
    searchItems,
    refreshItems: fetchItems,
  };
} 