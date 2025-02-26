import React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { Pig } from '@/utils/database';

export function usePigs() {
  const db = useSQLiteContext();
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const validateBreedExists = useCallback(async (breedId: number) => {
    const result = await db.getAllAsync<{count: number}>(
      'SELECT COUNT(*) as count FROM Breeds WHERE id = ?',
      [breedId]
    );
    return result[0].count > 0;
  }, [db]);

  // Fetch all pigs
  const fetchPigs = useCallback(async () => {
    try {
      console.log('Fetching all pigs...');
      setIsLoading(true);
      setError(null);
      const results = await db.getAllAsync<Pig>(`
        SELECT 
          Pigs.*, 
          Breeds.name as breed_name,
          (
            SELECT date 
            FROM monitoring_records 
            WHERE pig_id = Pigs.id 
            ORDER BY date DESC, created_at DESC 
            LIMIT 1
          ) as lastMonitoredDate,
          (
            SELECT strftime('%H:%M', created_at) 
            FROM monitoring_records 
            WHERE pig_id = Pigs.id 
            ORDER BY date DESC, created_at DESC 
            LIMIT 1
          ) as lastMonitoredTime
        FROM Pigs 
        LEFT JOIN Breeds ON Pigs.breed_id = Breeds.id
        ORDER BY name ASC
      `);
      console.log('Pigs fetched successfully:', results.length, 'pigs found');
      setPigs(results);
    } catch (e) {
      console.error('Error fetching pigs:', e);
      setError(e instanceof Error ? e : new Error('Failed to fetch pigs'));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  // Initial fetch
  useEffect(() => {
    fetchPigs();
  }, [fetchPigs]);

  // Add new pig
  const addPig = useCallback(async (pig: Omit<Pig, 'id'>) => {
    try {
      // Validate required data is available offline
      if (!pig.breed_id || !await validateBreedExists(pig.breed_id)) {
        throw new Error('Required breed data not available offline');
      }
      // Proceed with add operation
      console.log('Adding new pig:', pig);
      setError(null);
      const result = await db.runAsync(
        `INSERT INTO Pigs (
          name, age, weight, category, breed_id, image
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          pig.name,
          pig.age,
          pig.weight,
          pig.category,
          pig.breed_id,
          pig.image ?? null,
        ]
      );
      console.log('Pig added successfully:', result);
      await fetchPigs();
      return result.lastInsertRowId;
    } catch (err) {
      // Handle offline errors
      console.error('Error adding pig:', err);
      const error = err instanceof Error ? err : new Error('Failed to add pig');
      setError(error);
      throw error;
    }
  }, [db, fetchPigs]);

  // Update pig
  const updatePig = useCallback(async (pig: Omit<Pig, 'breed_name'>) => {
    try {
      console.log('Updating pig:', pig);
      setError(null);
      const result = await db.runAsync(
        `UPDATE Pigs 
         SET name = ?, age = ?, weight = ?, 
             category = ?, breed_id = ?, image = ?
         WHERE id = ?`,
        [
          pig.name,
          pig.age,
          pig.weight,
          pig.category,
          pig.breed_id,
          pig.image ?? null,
          pig.id,
        ]
      );
      console.log('Pig updated successfully:', result);
      await fetchPigs();
    } catch (e) {
      console.error('Error updating pig:', e);
      const error = e instanceof Error ? e : new Error('Failed to update pig');
      setError(error);
      throw error;
    }
  }, [db, fetchPigs]);

  // Delete pig
  const deletePig = useCallback(async (id: number) => {
    try {
      console.log('Deleting pig with ID:', id);
      setError(null);
      const result = await db.runAsync('DELETE FROM Pigs WHERE id = ?', [id]);
      console.log('Pig deleted successfully:', result);
      await fetchPigs();
    } catch (e) {
      console.error('Error deleting pig:', e);
      const error = e instanceof Error ? e : new Error('Failed to delete pig');
      setError(error);
      throw error;
    }
  }, [db, fetchPigs]);

  // Search pigs
  const searchPigs = useCallback(async (query: string) => {
    try {
      console.log('Searching pigs with query:', query);
      setIsLoading(true);
      setError(null);
      const results = await db.getAllAsync<Pig>(
        `SELECT Pigs.*, Breeds.name as breed_name 
         FROM Pigs 
         LEFT JOIN Breeds ON Pigs.breed_id = Breeds.id
         WHERE Pigs.name LIKE ? 
         ORDER BY name ASC`,
        [`%${query}%`]
      );
      console.log('Search results:', results.length, 'pigs found');
      setPigs(results);
    } catch (e) {
      console.error('Error searching pigs:', e);
      setError(e instanceof Error ? e : new Error('Failed to search pigs'));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  return {
    pigs,
    isLoading,
    error,
    addPig,
    updatePig,
    deletePig,
    searchPigs,
    refreshPigs: fetchPigs,
  };
} 