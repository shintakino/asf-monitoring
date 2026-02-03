import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

export const openDatabase = async () => {
  return await SQLite.openDatabaseAsync('asf_monitor.db');
};

export async function initDatabase(db: SQLite.SQLiteDatabase) {
  console.log('Initializing database...');
  try {
    // Enable WAL mode and foreign keys for better performance and data integrity
    await db.execAsync('PRAGMA journal_mode = WAL');
    await db.execAsync('PRAGMA foreign_keys = ON');

    console.log('WAL mode enabled');

    // Initialize database tables with new schema
    // Split execution to prevent native crashes
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS Breeds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        min_temp_adult REAL NOT NULL,
        max_temp_adult REAL NOT NULL,
        min_temp_young REAL NOT NULL,
        max_temp_young REAL NOT NULL
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS Pigs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        weight REAL NOT NULL,
        category TEXT CHECK(category IN ('Adult', 'Young')) NOT NULL,
        breed_id INTEGER NOT NULL,
        image TEXT,
        prone_level TEXT CHECK(prone_level IN ('Low', 'Moderate', 'High')) ,
        FOREIGN KEY (breed_id) REFERENCES Breeds(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS monitoring_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pig_id INTEGER NOT NULL,
        temperature REAL NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pig_id) REFERENCES Pigs(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pig_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        temperature_data TEXT NOT NULL,
        symptom_data TEXT NOT NULL,
        risk_analysis TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (pig_id) REFERENCES Pigs(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS Checklist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symptom TEXT NOT NULL,
        risk_weight INTEGER NOT NULL CHECK(risk_weight BETWEEN 1 AND 5),
        treatment_recommendation TEXT NOT NULL
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS checklist_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        monitoring_id INTEGER NOT NULL,
        checklist_id INTEGER NOT NULL,
        checked BOOLEAN NOT NULL DEFAULT 0,
        FOREIGN KEY (monitoring_id) REFERENCES monitoring_records(id) ON DELETE CASCADE,
        FOREIGN KEY (checklist_id) REFERENCES Checklist(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS Settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reminder_notifications BOOLEAN NOT NULL DEFAULT 1,
        checklist_items TEXT,
        breed_data TEXT,
        monitoring_start_time TEXT
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_pig_breed ON Pigs(breed_id);
      CREATE INDEX IF NOT EXISTS idx_monitoring_pig ON monitoring_records(pig_id);
      CREATE INDEX IF NOT EXISTS idx_checklist_monitoring ON checklist_records(monitoring_id);
    `); // Indexes can be batched

    // Insert default settings if needed
    await db.execAsync(`
      INSERT OR IGNORE INTO Settings (id, reminder_notifications, monitoring_start_time)
      VALUES (1, 1, '08:00');
    `);

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error during database initialization:', error);
    throw error;
  }
}

// Helper function to serialize checklist results to JSON
export function serializeChecklistResults(results: Record<string, boolean>): string {
  return JSON.stringify(results);
}

// Helper function to deserialize checklist results from JSON
export function deserializeChecklistResults(json: string): Record<string, boolean> {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

// Types for database entities
export interface Breed {
  id: number;
  name: string;
  min_temp_adult: number;
  max_temp_adult: number;
  min_temp_young: number;
  max_temp_young: number;
}

export interface Pig {
  id: number;
  name: string;
  age: number;
  weight: number;
  category: 'Adult' | 'Young';
  breed_id: number;
  breed_name?: string;
  image?: string | null;
  lastMonitoredDate?: string | null;
  lastMonitoredTime?: string | null;
}

export interface DailyMonitoring {
  id: number;
  pig_id: number;
  date: string;
  temperature: number;
  checklist_results: string; // JSON string
  prone_level: 'Low' | 'Moderate' | 'High';
}

export interface Checklist {
  id: number;
  symptom: string;
  risk_weight: number;
  treatment_recommendation: string;
}

export interface ChecklistResult {
  id: number;
  monitoring_id: number;
  checklist_id: number;
  checked: boolean;
}

export interface Settings {
  id: number;
  reminder_notifications: boolean;
  checklist_items?: string; // JSON string
  breed_data?: string; // JSON string
  monitoring_start_time: string; // Format: "HH:mm"
}

// Add these types
export interface MonitoringRecord {
  id: number;
  pig_id: number;
  temperature: number;
  date: string;
  time: string;
  notes?: string;
  created_at: string;
}

export interface ChecklistRecord {
  id: number;
  monitoring_id: number;
  checklist_id: number;
  checked: boolean;
  risk_weight: number;
  symptom: string;
  treatment_recommendation: string;
}

// Add this helper type
export interface MonitoringTiming {
  lastMonitoredDate?: string | null;
  lastMonitoredTime?: string | null;
  nextMonitoringTime?: string | null;
  canMonitor: boolean;
  timeRemaining?: string | null;
}

export interface Report {
  id?: number;
  pig_id: number;
  date: string;
  temperature_data: string; // JSON string of last 7 days
  symptom_data: string; // JSON string of last 7 days
  risk_analysis: string; // JSON string of risk scores
  notes: string | null;
  created_at: string;
}

export async function checkDatabaseHealth() {
  try {
    const db = await SQLite.openDatabaseAsync('asf_monitor.db');
    await db.execAsync('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Add table for critical monitoring windows
export const createCriticalTimeWindowsTable = async (db: SQLite.SQLiteDatabase) => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS critical_time_windows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pig_id INTEGER,
      start_time TEXT,
      end_time TEXT,
      reason TEXT,
      FOREIGN KEY (pig_id) REFERENCES pigs (id)
    );
  `);
};

export const createReportsTable = async (db: SQLite.SQLiteDatabase) => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pig_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      temperature_data TEXT NOT NULL,
      symptom_data TEXT NOT NULL,
      risk_analysis TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (pig_id) REFERENCES pigs (id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_reports_pig ON reports(pig_id);
    CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(date);
  `);
}; 