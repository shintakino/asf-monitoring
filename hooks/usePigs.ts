import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { Pig } from '@/utils/database';

export function usePigs() {
  const db = useSQLiteContext();
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all pigs
  const fetchPigs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const results = await db.getAllAsync<Pig>(`
        SELECT Pigs.*, Breeds.name as breed_name 
        FROM Pigs 
        LEFT JOIN Breeds ON Pigs.breed_id = Breeds.id
        ORDER BY name ASC
      `);
      setPigs(results);
    } catch (e) {
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
  const addPig = useCallback(async (pig: Omit<Pig, 'id' | 'breed_name'>) => {
    try {
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
      await fetchPigs();
      return result.lastInsertRowId;
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to add pig');
      setError(error);
      throw error;
    }
  }, [db, fetchPigs]);

  // Update pig
  const updatePig = useCallback(async (pig: Omit<Pig, 'breed_name'>) => {
    try {
      setError(null);
      await db.runAsync(
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
      await fetchPigs();
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to update pig');
      setError(error);
      throw error;
    }
  }, [db, fetchPigs]);

  // Delete pig
  const deletePig = useCallback(async (id: number) => {
    try {
      setError(null);
      await db.runAsync('DELETE FROM Pigs WHERE id = ?', [id]);
      await fetchPigs();
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to delete pig');
      setError(error);
      throw error;
    }
  }, [db, fetchPigs]);

  // Search pigs
  const searchPigs = useCallback(async (query: string) => {
    try {
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
      setPigs(results);
    } catch (e) {
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