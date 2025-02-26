import React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { MonitoringRecord, ChecklistRecord } from '@/utils/database';

export function useMonitoring(pigId?: number) {
  const db = useSQLiteContext();
  const [records, setRecords] = useState<MonitoringRecord[]>([]);
  const [checklistRecords, setChecklistRecords] = useState<ChecklistRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // If pigId is provided, fetch records for specific pig
      const recordsQuery = pigId 
        ? `SELECT monitoring_records.*, checklist_records.checked, Checklist.risk_weight 
           FROM monitoring_records 
           LEFT JOIN checklist_records ON checklist_records.monitoring_id = monitoring_records.id
           LEFT JOIN Checklist ON checklist_records.checklist_id = Checklist.id
           WHERE pig_id = ? 
           ORDER BY date DESC`
        : `SELECT monitoring_records.*, checklist_records.checked, Checklist.risk_weight 
           FROM monitoring_records 
           LEFT JOIN checklist_records ON checklist_records.monitoring_id = monitoring_records.id
           LEFT JOIN Checklist ON checklist_records.checklist_id = Checklist.id
           ORDER BY date DESC`;

      const results = await db.getAllAsync<MonitoringRecord>(
        recordsQuery,
        pigId ? [pigId] : []
      );
      setRecords(results);

      // Fetch checklist records
      const checklistQuery = pigId
        ? `SELECT cr.*, c.symptom, c.risk_weight, c.treatment_recommendation 
           FROM checklist_records cr
           JOIN Checklist c ON cr.checklist_id = c.id
           WHERE cr.monitoring_id IN (
             SELECT id FROM monitoring_records WHERE pig_id = ?
           )`
        : `SELECT cr.*, c.symptom, c.risk_weight, c.treatment_recommendation 
           FROM checklist_records cr
           JOIN Checklist c ON cr.checklist_id = c.id`;

      const checklistResults = await db.getAllAsync<ChecklistRecord>(
        checklistQuery,
        pigId ? [pigId] : []
      );
      setChecklistRecords(checklistResults);
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
      
      // Insert monitoring record using only created_at for timestamp
      const result = await db.runAsync(
        `INSERT INTO monitoring_records (pig_id, temperature, date, notes, created_at) 
         VALUES (?, ?, date('now'), ?, datetime('now', 'localtime'))`,
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

  // Initial load
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return {
    records,
    checklistRecords,
    isLoading,
    error,
    addRecord,
    refreshRecords: fetchRecords,
  };
} 