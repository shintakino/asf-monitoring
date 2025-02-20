import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { Breed } from '@/utils/database';

export function useBreeds() {
  const db = useSQLiteContext();
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all breeds
  const fetchBreeds = useCallback(async () => {
    try {
      setIsLoading(true);
      const results = await db.getAllAsync<Breed>(`
        SELECT * FROM Breeds 
        ORDER BY name ASC
      `);
      setBreeds(results);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch breeds'));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  // Add new breed
  const addBreed = useCallback(async (breed: Omit<Breed, 'id'>) => {
    try {
      console.log('Adding breed:', breed);
      const result = await db.runAsync(
        `INSERT INTO Breeds (
          name, 
          min_temp_adult, 
          max_temp_adult, 
          min_temp_young, 
          max_temp_young
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          breed.name,
          breed.min_temp_adult,
          breed.max_temp_adult,
          breed.min_temp_young,
          breed.max_temp_young,
        ]
      );
      
      console.log('Breed added successfully:', result);
      // Immediately fetch updated breeds
      await fetchBreeds();
      return result.lastInsertRowId;
    } catch (e) {
      console.error('Error adding breed:', e);
      throw e instanceof Error ? e : new Error('Failed to add breed');
    }
  }, [db, fetchBreeds]);

  // Update breed
  const updateBreed = useCallback(async (breed: Breed) => {
    try {
      console.log('Updating breed:', breed);
      await db.runAsync(
        `UPDATE Breeds 
         SET name = ?, 
             min_temp_adult = ?, 
             max_temp_adult = ?,
             min_temp_young = ?,
             max_temp_young = ?
         WHERE id = ?`,
        [
          breed.name,
          breed.min_temp_adult,
          breed.max_temp_adult,
          breed.min_temp_young,
          breed.max_temp_young,
          breed.id,
        ]
      );
      
      console.log('Breed updated successfully');
      // Immediately fetch updated breeds
      await fetchBreeds();
    } catch (e) {
      console.error('Error updating breed:', e);
      throw e instanceof Error ? e : new Error('Failed to update breed');
    }
  }, [db, fetchBreeds]);

  // Delete breed
  const deleteBreed = useCallback(async (id: number) => {
    try {
      await db.runAsync('DELETE FROM Breeds WHERE id = ?', [id]);
      await fetchBreeds();
    } catch (e) {
      throw e instanceof Error ? e : new Error('Failed to delete breed');
    }
  }, [db, fetchBreeds]);

  // Search breeds
  const searchBreeds = useCallback(async (query: string) => {
    try {
      setIsLoading(true);
      const results = await db.getAllAsync<Breed>(
        `SELECT * FROM Breeds 
         WHERE name LIKE ? 
         ORDER BY name ASC`,
        [`%${query}%`]
      );
      setBreeds(results);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to search breeds'));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  // Initial load and refresh on focus
  useEffect(() => {
    fetchBreeds();
  }, [fetchBreeds]);

  return {
    breeds,
    isLoading,
    error,
    addBreed,
    updateBreed,
    deleteBreed,
    searchBreeds,
    refreshBreeds: fetchBreeds,
  };
}
