import React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { MonitoringRecord, ChecklistRecord } from '@/utils/database';
import { formatInTimeZone, getTimezoneOffset } from 'date-fns-tz';

const TIMEZONE = 'Asia/Singapore';

interface Report {
  id?: number;
  pig_id: number;
  date: string;
  temperature_data: string; // JSON string of last 7 days
  symptom_data: string; // JSON string of last 7 days
  risk_analysis: string; // JSON string of risk scores
  notes: string | null;
  created_at: string;
}

export function useMonitoring(pigId?: number) {
  const db = useSQLiteContext();
  const [records, setRecords] = useState<MonitoringRecord[]>([]);
  const [checklistRecords, setChecklistRecords] = useState<ChecklistRecord[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Create reports table if it doesn't exist
  useEffect(() => {
    const initDB = async () => {
      try {
        await db.runAsync(`
          CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pig_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            temperature_data TEXT NOT NULL,
            symptom_data TEXT NOT NULL,
            risk_analysis TEXT NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (pig_id) REFERENCES pigs (id)
          )
        `);
      } catch (e) {
        console.error('Error creating reports table:', e);
      }
    };

    initDB();
  }, [db]);

  // Add function to save report
  const saveReport = useCallback(async (report: Omit<Report, 'id'>) => {
    try {
      const result = await db.runAsync(
        `INSERT INTO reports (
          pig_id, date, temperature_data, symptom_data, 
          risk_analysis, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          report.pig_id,
          report.date,
          report.temperature_data,
          report.symptom_data,
          report.risk_analysis,
          report.notes,
          report.created_at
        ]
      );
      return result.lastInsertRowId;
    } catch (e) {
      console.error('Error saving report:', e);
      throw e instanceof Error ? e : new Error('Failed to save report');
    }
  }, [db]);

  // Add function to fetch reports
  const fetchReports = useCallback(async () => {
    if (!pigId) return;

    try {
      const results = await db.getAllAsync<Report>(
        'SELECT * FROM reports WHERE pig_id = ? ORDER BY date DESC',
        [pigId]
      );
      setReports(results);
    } catch (e) {
      console.error('Error fetching reports:', e);
      throw e instanceof Error ? e : new Error('Failed to fetch reports');
    }
  }, [db, pigId]);

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
           ORDER BY date DESC, created_at DESC`
        : `SELECT monitoring_records.*, checklist_records.checked, Checklist.risk_weight 
           FROM monitoring_records 
           LEFT JOIN checklist_records ON checklist_records.monitoring_id = monitoring_records.id
           LEFT JOIN Checklist ON checklist_records.checklist_id = Checklist.id
           ORDER BY date DESC, created_at DESC`;

      const results = await db.getAllAsync<MonitoringRecord>(
        recordsQuery,
        pigId ? [pigId] : []
      );

      // Convert dates to Singapore timezone
      const recordsWithLocalDates = results.map(record => ({
        ...record,
        date: formatInTimeZone(new Date(record.date), TIMEZONE, 'yyyy-MM-dd'),
        created_at: formatInTimeZone(new Date(record.created_at), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX")
      }));
      
      setRecords(recordsWithLocalDates);

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
      
      // Get current date in Singapore timezone
      const now = new Date();
      const sgDate = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd');
      const sgDateTime = formatInTimeZone(now, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
      
      // Insert monitoring record
      const result = await db.runAsync(
        `INSERT INTO monitoring_records (pig_id, temperature, date, notes, created_at) 
         VALUES (?, ?, ?, ?, datetime(?, 'localtime'))`,
        [pigId, temperature, sgDate, notes || null, sgDateTime]
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
      await fetchReports();
    } catch (e) {
      console.error('Error adding monitoring record:', e);
      throw e instanceof Error ? e : new Error('Failed to add record');
    }
  }, [db, pigId, fetchRecords, fetchReports]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      await fetchRecords();
      if (pigId) {
        await fetchReports();
      }
    };
    loadData();
  }, [fetchRecords, fetchReports, pigId]);

  // Add temperature trend analysis
  const analyzeTrend = (pigId: number) => {
    const recentRecords = records
      ?.filter(r => r.pig_id === pigId)
      .slice(0, 3);
    
    if (recentRecords?.length >= 3) {
      const temps = recentRecords.map(r => r.temperature);
      if (temps.every((t, i) => i === 0 || t > temps[i - 1])) {
        return 'increasing';
      }
      if (temps.every((t, i) => i === 0 || t < temps[i - 1])) {
        return 'decreasing';
      }
    }
    return 'stable';
  };

  return {
    records,
    checklistRecords,
    reports,
    isLoading,
    error,
    addRecord,
    saveReport,
    refreshRecords: fetchRecords,
    refreshReports: fetchReports,
    analyzeTrend,
  };
} 