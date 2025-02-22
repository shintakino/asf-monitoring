import { createContext, useContext, useEffect, useState } from 'react';
import { initDatabase } from '@/utils/database';
import { SQLiteProvider } from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

type DatabaseContextType = {
  database: SQLiteDatabase | null;
  isLoading: boolean;
  error: Error | null;
};

const DatabaseContext = createContext<DatabaseContextType>({
  database: null,
  isLoading: true,
  error: null,
});

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  return (
    <SQLiteProvider databaseName="asf_monitor.db" onInit={async (db) => {
      try {
        // Enable WAL mode and foreign keys
        await db.execAsync('PRAGMA journal_mode = WAL');
        await db.execAsync('PRAGMA foreign_keys = ON');
        await db.execAsync('DELETE FROM monitoring_records');
        await db.execAsync('DELETE FROM checklist_records');
        await db.execAsync('DROP TABLE IF EXISTS Settings');
        // Create Breeds table
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS Breeds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            min_temp_adult REAL NOT NULL,
            max_temp_adult REAL NOT NULL,
            min_temp_young REAL NOT NULL,
            max_temp_young REAL NOT NULL
          )
        `);

        // Create Pigs table
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS Pigs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            age INTEGER NOT NULL,
            weight REAL NOT NULL,
            category TEXT CHECK(category IN ('Adult', 'Young')) NOT NULL,
            breed_id INTEGER NOT NULL,
            image TEXT,
            FOREIGN KEY (breed_id) REFERENCES Breeds(id) ON DELETE CASCADE
          )
        `);

        // Create Checklist table
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS Checklist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symptom TEXT NOT NULL,
            risk_weight INTEGER NOT NULL CHECK(risk_weight BETWEEN 1 AND 5),
            treatment_recommendation TEXT NOT NULL
          )
        `);

        // Create monitoring_records table
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS monitoring_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pig_id INTEGER NOT NULL,
            temperature REAL NOT NULL,
            date DATE NOT NULL,
            time TIME NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pig_id) REFERENCES Pigs(id) ON DELETE CASCADE
          )
        `);

        // Create checklist_records table
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS checklist_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            monitoring_id INTEGER NOT NULL,
            checklist_id INTEGER NOT NULL,
            checked BOOLEAN NOT NULL DEFAULT 0,
            FOREIGN KEY (monitoring_id) REFERENCES monitoring_records(id) ON DELETE CASCADE,
            FOREIGN KEY (checklist_id) REFERENCES Checklist(id) ON DELETE CASCADE
          )
        `);

        // Create Settings table
        await db.execAsync(`          CREATE TABLE IF NOT EXISTS Settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reminder_notifications BOOLEAN NOT NULL DEFAULT 1,
            checklist_items TEXT,
            breed_data TEXT,
            monitoring_start_time TEXT NOT NULL DEFAULT '08:00'
          );
          
          -- Insert default settings if not exists
          INSERT OR IGNORE INTO Settings (id, monitoring_start_time) 
          VALUES (1, '08:00');
        `);

        // Create indexes for better performance
        await db.execAsync(`
          CREATE INDEX IF NOT EXISTS idx_pig_breed ON Pigs(breed_id);
          CREATE INDEX IF NOT EXISTS idx_monitoring_pig ON monitoring_records(pig_id);
          CREATE INDEX IF NOT EXISTS idx_monitoring_date ON monitoring_records(date);
          CREATE INDEX IF NOT EXISTS idx_checklist_monitoring ON checklist_records(monitoring_id);
          CREATE INDEX IF NOT EXISTS idx_checklist_item ON checklist_records(checklist_id);
        `);

      } catch (e) {
        console.error('Database initialization failed:', e);
        throw e;
      }
    }}>
      {children}
    </SQLiteProvider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
} 
