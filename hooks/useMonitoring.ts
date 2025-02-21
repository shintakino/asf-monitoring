import { useState, useCallback, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { MonitoringRecord, ChecklistRecord } from '@/utils/database';

export function useMonitoring(pigId?: number) {
  const db = useSQLiteContext();
  const [records, setRecords] = useState<MonitoringRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!pigId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const results = await db.getAllAsync<MonitoringRecord>(
        `SELECT * FROM monitoring_records WHERE pig_id = ? ORDER BY date DESC`,
        [pigId]
      );
      setRecords(results);
    } catch (e) {
      console.error('Error fetching monitoring records:', e);
      setError(e instanceof Error ? e : new Error('Failed to fetch records'));
    } finally {
      setIsLoading(false);
    }
  }, [db, pigId]);

  const addRecord = useCallback(async (
    temperature: number,
    checklistItems: Record<number, boolean>,
    notes?: string
  ) => {
    if (!pigId) return;

    try {
      setError(null);
      
      // Insert monitoring record with notes
      const result = await db.runAsync(
        `INSERT INTO monitoring_records (pig_id, temperature, date, notes) 
         VALUES (?, ?, date('now'), ?)`,
        [pigId, temperature, notes || null]
      );

      // Insert checklist records
      const monitoringId = result.lastInsertRowId;
      for (const [checklistId, checked] of Object.entries(checklistItems)) {
        await db.runAsync(
          `INSERT INTO checklist_records (monitoring_id, checklist_id, checked)
           VALUES (?, ?, ?)`,
          [monitoringId, checklistId, checked ? 1 : 0]
        );
      }

      await fetchRecords();
    } catch (e) {
      console.error('Error adding monitoring record:', e);
      throw e instanceof Error ? e : new Error('Failed to add record');
    }
  }, [db, pigId, fetchRecords]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return {
    records,
    isLoading,
    error,
    addRecord,
    refreshRecords: fetchRecords,
  };
} 