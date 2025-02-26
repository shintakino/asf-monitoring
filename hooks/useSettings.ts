import React from 'react';
import { useState, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { Settings } from '@/utils/database';

export function useSettings() {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const results = await db.getAllAsync<Settings>('SELECT * FROM Settings LIMIT 1');
      setSettings(results[0] || null);
    } catch (e) {
      console.error('Error fetching settings:', e);
      setError(e instanceof Error ? e : new Error('Failed to fetch settings'));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  const updateMonitoringTime = useCallback(async (time: string) => {
    try {
      setError(null);
      await db.runAsync(
        'UPDATE Settings SET monitoring_start_time = ? WHERE id = 1',
        [time]
      );
      await fetchSettings();
    } catch (e) {
      console.error('Error updating monitoring time:', e);
      throw e instanceof Error ? e : new Error('Failed to update monitoring time');
    }
  }, [db, fetchSettings]);

  return {
    settings,
    isLoading,
    error,
    updateMonitoringTime,
    refreshSettings: fetchSettings,
  };
} 