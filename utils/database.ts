import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

export async function initDatabase() {
  const db = await SQLite.openDatabaseAsync('asf_monitor.db');

  // Enable WAL mode and foreign keys for better performance and data integrity
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA foreign_keys = ON');

  // Drop existing table to recreate with new schema
  await db.execAsync('DROP TABLE IF EXISTS Breeds');

  // Initialize database tables with new schema
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Breeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      min_temp_adult REAL NOT NULL,
      max_temp_adult REAL NOT NULL,
      min_temp_young REAL NOT NULL,
      max_temp_young REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Pigs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      weight REAL NOT NULL,
      category TEXT CHECK(category IN ('Adult', 'Young')) NOT NULL,
      breed_id INTEGER NOT NULL,
      image TEXT,
      prone_level TEXT CHECK(prone_level IN ('Low', 'Moderate', 'High')) NOT NULL,
      FOREIGN KEY (breed_id) REFERENCES Breeds(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS DailyMonitoring (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pig_id INTEGER NOT NULL,
      date DATE NOT NULL,
      temperature REAL NOT NULL,
      checklist_results TEXT NOT NULL,
      FOREIGN KEY (pig_id) REFERENCES Pigs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Checklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symptom TEXT NOT NULL,
      risk_weight INTEGER NOT NULL CHECK(risk_weight BETWEEN 1 AND 5),
      treatment_recommendation TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ChecklistResults (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      monitoring_id INTEGER NOT NULL,
      checklist_id INTEGER NOT NULL,
      checked BOOLEAN NOT NULL DEFAULT 0,
      FOREIGN KEY (monitoring_id) REFERENCES DailyMonitoring(id) ON DELETE CASCADE,
      FOREIGN KEY (checklist_id) REFERENCES Checklist(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reminder_notifications BOOLEAN NOT NULL DEFAULT 1,
      checklist_items TEXT,
      breed_data TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_pig_breed ON Pigs(breed_id);
    CREATE INDEX IF NOT EXISTS idx_monitoring_pig ON DailyMonitoring(pig_id);
    CREATE INDEX IF NOT EXISTS idx_checklist_results ON ChecklistResults(monitoring_id, checklist_id);
  `);

  return db;
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
  image?: string;
  
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
} 